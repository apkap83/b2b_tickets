import { User, DefaultUser, NextAuthOptions } from 'next-auth';
import { headers } from 'next/headers';
import Credentials from 'next-auth/providers/credentials';
import { isValidEmail, getWhereObj } from '@b2b-tickets/utils';
import bcrypt from 'bcryptjs';
import { config } from '@b2b-tickets/config';
import {
  ErrorCode,
  TransportName,
  AppPermissionType,
  AppRoleTypes,
  CredentialsType,
  B2BUserType,
} from '@b2b-tickets/shared-models';
import {
  AppPermission,
  AppRole,
  B2BUser,
  pgB2Bpool,
  setSchemaAndTimezone,
} from '@b2b-tickets/db-access';

import { createRequestLogger } from '@b2b-tickets/logging';
import { CustomLogger } from '@b2b-tickets/logging';
import { validateReCaptchaV3 } from '@b2b-tickets/utils';
import {
  sendOTP,
  generateAndRedisStoreNewOTPForUser,
  validateOTPCodeForUserThroughRedis,
  maxOTPAttemptsReached,
  removeOTPKey,
  removeOTPAttemptsKey,
  removeTokenKey,
} from '@b2b-tickets/totp-service/server';

import { verifyJWTTotp, verifyJWTTokenForEmail } from './jwtVerification';

function getRequestLogger(transportName: TransportName) {
  // Ensure this is executed in a server-side context
  try {
    const headersList = headers(); // Server-side request headers
    const reqIP = headersList.get('request-ip') || 'unknown-ip';
    const reqURL = headersList.get('request-url') || 'unknown-url';
    const sessionId = headersList.get('session-id') || 'unknown-session';

    // Create the request logger with gathered headers
    const logRequest = createRequestLogger(
      transportName,
      reqIP,
      reqURL,
      sessionId
    );

    return logRequest;
  } catch (error) {
    // Log or handle the error if this function is called outside server-side context
    console.error(
      'Failed to retrieve headers. Ensure this is used server-side:',
      error
    );
    throw new Error('getRequestLogger must be used in a server-side context.');
  }
}

export const tryLocalAuthentication = async (
  credentials: CredentialsType,
  logRequest: CustomLogger
) => {
  try {
    logRequest.debug(
      `Trying Local authentication for user name: ${
        credentials ? credentials.userName : 'Not Given'
      }`
    );

    const emailProvided = isValidEmail(credentials?.userName!);

    const foundUser = (await B2BUser.scope('withPassword').findOne({
      where: getWhereObj(credentials, emailProvided),
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    })) as typeof B2BUser & {
      AppRoles: (typeof AppRole & {
        AppPermissions: (typeof AppPermission)[];
      })[];
    };

    if (!foundUser) {
      logRequest.error(`Incorrect user name provided`);
      // Introduce a 1500ms delay before returning error response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    // ⭐ Get ALL user records with this email for bulk updates
    const allUserRecords = await B2BUser.findAll({
      where: emailProvided
        ? { email: credentials?.userName.toLowerCase() }
        : { username: credentials?.userName },
    });

    // ⭐ Update last_login_attempt for ALL records
    const updatePromises = allUserRecords.map(async (user: typeof B2BUser) => {
      user.last_login_attempt = new Date();
      return user.save();
    });
    await Promise.all(updatePromises);

    // foundUser.last_login_attempt = new Date();

    if (foundUser.is_locked === 'y') {
      logRequest.error(
        `User with user name '${foundUser.username}' is currently locked`
      );

      // ⭐ Update ALL user records with failed login
      const failPromises = allUserRecords.map(async (user: typeof B2BUser) => {
        user.last_login_status = 'f';
        user.last_login_failed_attempts =
          Number(user.last_login_failed_attempts || 0) + 1;
        return user.save();
      });
      await Promise.all(failPromises);

      // foundUser.last_login_status = 'f';
      // foundUser.last_login_failed_attempts =
      //   Number(foundUser.last_login_failed_attempts || 0) + 1;
      // foundUser.save();
      throw new Error(ErrorCode.UserIsLocked);
    }

    if (foundUser.is_active !== 'y') {
      logRequest.error(
        `User with user name '${foundUser.username}' is not currently active`
      );

      // ⭐ Update ALL user records with failed login
      const failPromises = allUserRecords.map(async (user: typeof B2BUser) => {
        user.last_login_status = 'f';
        user.last_login_failed_attempts =
          Number(user.last_login_failed_attempts || 0) + 1;
        return user.save();
      });
      await Promise.all(failPromises);

      // foundUser.last_login_status = 'f';
      // foundUser.last_login_failed_attempts =
      //   Number(foundUser.last_login_failed_attempts || 0) + 1;
      // foundUser.save();
      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    const match = await bcrypt.compare(
      credentials!.password,
      foundUser.password
    );

    if (!match) {
      logRequest.error(`Incorrect password provided`);

      // ⭐ Update ALL user records with failed login
      const failPromises = allUserRecords.map(async (user: typeof B2BUser) => {
        user.last_login_status = 'f';
        user.last_login_failed_attempts =
          Number(user.last_login_failed_attempts || 0) + 1;
        return user.save();
      });
      await Promise.all(failPromises);

      // foundUser.last_login_status = 'f';
      // foundUser.last_login_failed_attempts =
      //   Number(foundUser.last_login_failed_attempts || 0) + 1;

      // foundUser.save();
      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    const successPromises = allUserRecords.map(async (user: typeof B2BUser) => {
      user.last_login_status = 's';
      user.last_login_failed_attempts = 0;
      return user.save();
    });
    await Promise.all(successPromises);

    // foundUser.last_login_status = 's';
    // foundUser.last_login_failed_attempts = 0;
    // await foundUser.save();

    logRequest.debug(`Given password and DB passwords match`);

    const roles = foundUser.AppRoles.map(
      (role: any) => role.roleName as AppRoleTypes
    );

    const permissions: AppPermissionType[] = foundUser.AppRoles.flatMap(
      (role: any) =>
        //@ts-ignore
        role.AppPermissions.map((permission) => ({
          permissionName: permission.permissionName,
          permissionEndPoint: permission.endPoint,
          permissionDescription: permission.description,
        }))
    );

    // Find Customer Name from Customer ID
    await setSchemaAndTimezone(pgB2Bpool);
    const queryForCustomerName =
      'SELECT customer_name FROM customers WHERE customer_id = $1';
    const customerNameRes = await pgB2Bpool.query(queryForCustomerName, [
      foundUser.customer_id,
    ]);

    const customer_name = customerNameRes.rows[0]['customer_name'];
    const userDetails = {
      id: String(foundUser.user_id),
      user_id: foundUser.user_id,
      customer_id: Number(foundUser.customer_id),
      customer_name: customer_name,
      firstName: foundUser.first_name,
      lastName: foundUser.last_name,
      userName: foundUser.username,
      email: foundUser.email,
      mobilePhone: foundUser.mobile_phone || '',
      authenticationType: foundUser.authentication_type,
      roles,
      permissions,
      two_factor_secret: foundUser.two_factor_secret,
      forcedToChangePassword: foundUser.change_password === 'y',
      mfa_method: foundUser.mfa_method,
      // Overwriting the toString method
      toString: function () {
        return `User ID: ${this.user_id}, Customer ID: ${this.customer_id}, Customer Name: ${this.customer_name}, Name: ${this.firstName} ${this.lastName}, Username: ${this.userName} Email: ${this.email}, Mobile Phone: ${this.mobilePhone}, Auth Type: ${this.authenticationType}`;
      },
    };

    logRequest.debug(`Valid User Name/Password was provided`);

    return userDetails;
  } catch (error: unknown) {
    logRequest.error(error);
    throw error;
  }
};

export const performPasswordReset = async (
  credentials: any,
  logRequest: CustomLogger
) => {
  try {
    logRequest.debug(
      `Performing Password Reset for user name: ${
        credentials ? credentials.userName : 'Not Given'
      }`
    );

    if (!credentials || !credentials.userName) {
      throw new Error(ErrorCode.UserNotFound);
    }

    const emailProvided = isValidEmail(credentials?.userName!);

    const foundUser = await B2BUser.scope('withPassword').findOne({
      where: getWhereObj(credentials, emailProvided),
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    });

    if (!foundUser) {
      logRequest.error(`Incorrect user name provided`);
      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    const match = await bcrypt.compare(
      credentials!.password,
      foundUser.password
    );

    if (!match) {
      logRequest.error(`Incorrect password provided`);
      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    logRequest.debug(`Given password and DB passwords match`);

    if (!credentials?.newPassword) {
      throw new Error(ErrorCode.NewPasswordRequired);
    }

    // Set New Password
    foundUser.password = credentials?.newPassword;

    // Set New Password Change Date
    foundUser.password_change_date = new Date();

    // Reset Flag
    foundUser.change_password = 'n';

    await foundUser.save();
    return true;
  } catch (error) {
    throw error;
  }
};

export const options: NextAuthOptions = {
  providers: [
    Credentials({
      id: 'credentials-login',
      name: 'Local & LDAP Authentication & Forced Password Reset',
      credentials: {
        userName: {
          label: 'User Name',
          type: 'text',
          placeholder: '',
        },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'captchaToken', type: 'text' },
        totpCode: { label: 'Time-Based One-Time Password', type: 'text' },
        newPassword: { label: 'newPassword', type: 'text' },
      },
      async authorize(credentials: any, req: any) {
        const logRequest: CustomLogger = await getRequestLogger(
          TransportName.AUTH
        );

        try {
          if (!credentials?.userName || !credentials?.password) {
            throw new Error(ErrorCode.NoCredentialsProvided);
          }

          // Validate JWT Token for Captcha Validation
          if (config.CaptchaIsActive) {
            // verifyJWTCaptcha({ req });
            // Recaptcha response
            const data = await validateReCaptchaV3(credentials.captchaToken);
            if (!data) {
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            }
            if (!data.success || data.score < config.CaptchaV3Threshold) {
              logRequest.error('Failed: Captcha v3 Data:', data);
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            } else {
              logRequest.info('Successful: Captcha v3 Data:', data);
            }
          }

          const localAuthUserDetails = await tryLocalAuthentication(
            credentials,
            logRequest
          );

          if (!localAuthUserDetails) {
            logRequest.error(
              'LocalAuthUserDetails object from Local Authentication is faulty'
            );
            throw new Error(ErrorCode.InternalServerError);
          }

          // Without Roles Assigned - The user should not login
          if (localAuthUserDetails?.roles.length === 0) {
            throw new Error(ErrorCode.NoRoleAssignedToUser);
          }

          // Without Two Factor Authentication The User is Now Authenticated
          if (!config.TwoFactorEnabled) {
            // Check if The User should be forced to change password
            if (localAuthUserDetails?.forcedToChangePassword) {
              if (!credentials.newPassword) {
                throw new Error(ErrorCode.NewPasswordRequired);
              }
              performPasswordReset(credentials, logRequest);
            }

            logRequest.info(
              `Local User '${credentials.userName}' has been successfully authenticated`
            );
            return localAuthUserDetails;
          }

          logRequest.debug(
            `Requesting OTP Autentication from user ${localAuthUserDetails.userName}`
          );

          // Check If Max OTP Attempts have Already been Reached
          const maxOTPsReached = await maxOTPAttemptsReached(req);
          if (maxOTPsReached) {
            throw new Error(ErrorCode.MaxOtpAttemptsRequested);
          }

          if (!credentials.totpCode) {
            // Generate and store in Redis the New OTP Code
            const newOTP = await generateAndRedisStoreNewOTPForUser(req);

            if (newOTP) {
              // Send New OTP To The User depending on MFA Method
              sendOTP(localAuthUserDetails.email, newOTP!);
            }

            // Require OTP From The User
            throw new Error(ErrorCode.SecondFactorRequired);
          }

          // SECURITY: Admin TOTP bypass for the single admin user
          // Enhanced with proper validation and audit logging
          if (localAuthUserDetails.userName === 'admin') {
            // Additional validation: ensure admin has proper role
            const hasAdminRole = localAuthUserDetails.roles.includes('Admin');
            
            if (!hasAdminRole) {
              logRequest.error(
                `SECURITY ALERT: User with admin username lacks Admin role - user_id: ${localAuthUserDetails.user_id}`
              );
              throw new Error(ErrorCode.IncorrectUsernameOrPassword);
            }

            // Audit log for admin TOTP bypass
            logRequest.info(
              `Admin TOTP bypass used - user_id: ${localAuthUserDetails.user_id}, customer_id: ${localAuthUserDetails.customer_id}, IP: ${req?.ip || 'unknown'}`
            );
            logRequest.info(
              `Local User '${credentials.userName}' has been successfully authenticated`
            );
            return localAuthUserDetails;
          }

          // Validate Saved OTP In Redis for Source IP
          const otpProvidedCorrect = await validateOTPCodeForUserThroughRedis(
            req,
            credentials.totpCode
          );

          if (typeof otpProvidedCorrect === 'object') {
            if (otpProvidedCorrect.eligibleForNewOtpAttempt) {
              throw new Error(
                `${ErrorCode.IncorrectTwoFactorCode}__${otpProvidedCorrect.remainingOTPAttempts}`
              );
            }
            throw new Error(ErrorCode.MaxOtpAttemptsRequested);
          }

          logRequest.info(
            `Local User '${credentials.userName}' has been successfully authenticated`
          );

          // Check if The User should be forced to change password
          if (localAuthUserDetails?.forcedToChangePassword) {
            if (!credentials.newPassword) {
              throw new Error(ErrorCode.NewPasswordRequired);
            }
            performPasswordReset(credentials, logRequest);
          }

          // After Successful Login - Remove OTP Key & Attempts & Token
          removeOTPKey(req, req.body.userName);
          removeOTPAttemptsKey(req, req.body.email || req.body.userName);
          removeTokenKey(req, req.body.email || req.body.userName);

          return localAuthUserDetails;
        } catch (error: unknown) {
          const permittedErrorsToFrontEnd: string[] = [
            ErrorCode.SecondFactorRequired,
            ErrorCode.IncorrectTwoFactorCode,
            ErrorCode.IncorrectUsernameOrPassword,
            ErrorCode.NoRoleAssignedToUser,
            ErrorCode.CaptchaJWTTokenRequired,
            ErrorCode.EmailIsRequired,
            ErrorCode.TotpJWTTokenRequired,
            ErrorCode.NewPasswordRequired,
            ErrorCode.CaptchaJWTTokenInvalid,
            ErrorCode.MaxOtpAttemptsRequested,
          ].map(String);

          if (
            error instanceof Error &&
            (permittedErrorsToFrontEnd.includes(error.message) ||
              error.message.startsWith(ErrorCode.IncorrectTwoFactorCode))
          ) {
            logRequest.error(error.message);
            throw error;
          }
          // Handle other errors privately
          logRequest.error(error);
          throw new Error(ErrorCode.InternalServerError);
        }
      },
    }),
    Credentials({
      id: 'credentials-password-reset',
      name: 'Password Reset',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'Your email',
        },
        captchaToken: { label: 'captchaToken', type: 'text' },
        tokenForEmail: {
          label: 'Token',
          type: 'text',
          placeholder: 'Your token',
        },
        newPassword: { label: 'newPassword', type: 'text' },
      },
      async authorize(credentials: any, req: any) {
        const logRequest: CustomLogger = await getRequestLogger(
          TransportName.AUTH
        );
        try {
          const {
            email: emailProvided,
            tokenForEmail,
            newPassword,
            captchaToken,
          } = credentials;

          // Validate JWT Token for Captcha Validation
          if (config.CaptchaIsActiveForPasswordReset) {
            // verifyJWTCaptcha({ req });
            // Recaptcha response
            const data = await validateReCaptchaV3(captchaToken);
            if (!data) {
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            }
            if (!data.success || data.score < config.CaptchaV3Threshold) {
              logRequest.info('Captcha v3 Data:', data);
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            }
          }

          // Convert Provided Email to lowercase
          let email = emailProvided.toLowerCase();

          if (!email) {
            throw new Error(ErrorCode.EmailIsRequired);
          }

          const foundUser = await B2BUser.findOne({
            where: {
              email,
            },
            include: {
              model: AppRole,
              include: [AppPermission],
            },
          });

          if (!foundUser) {
            logRequest.error(
              'Incorrect E-mail provided for Password Reset Procedure'
            );

            // Introduce a 1500ms delay before returning error response
            await new Promise((resolve) => setTimeout(resolve, 1500));

            throw new Error(
              ErrorCode.IfAccountExistsYouWillReceivePasswordResetLink
            );
          }

          if (config.TwoFactorEnabledForPasswordReset) {
            // Check If Max OTP Attempts have Already been Reached
            const maxOTPsReached = await maxOTPAttemptsReached(
              req,
              foundUser.email || foundUser.username
            );
            if (maxOTPsReached) {
              throw new Error(ErrorCode.MaxOtpAttemptsRequested);
            }

            // Generate and store in Redis the New OTP Code
            const newOTP = await generateAndRedisStoreNewOTPForUser(
              req,
              foundUser.email || foundUser.username
            );

            if (newOTP) {
              // Sending New OTP...
              await sendOTP(foundUser.email, newOTP);
            }
            verifyJWTTotp({ req });
          }

          if (!tokenForEmail) {
            throw new Error(ErrorCode.TokenForEmailRequired);
          }

          verifyJWTTokenForEmail({
            req,
            email,
            tokenProvidedFromUser: tokenForEmail,
          });

          if (!newPassword) {
            throw new Error(ErrorCode.NewPasswordRequired);
          }

          // Get ALL user records with this email for bulk updates
          const allUserRecords = await B2BUser.findAll({
            where: { email },
          });

          // Update last login status and attempts
          const successPromises = allUserRecords.map(
            async (user: typeof B2BUser) => {
              user.last_login_status = 's';
              user.last_login_attempt = new Date();
              user.last_login_failed_attempts = 0;
              user.password = newPassword;
              return user.save();
            }
          );
          await Promise.all(successPromises);

          // After Successful Password Change - Remove OTP Key & Attempts & Token
          removeOTPKey(req, req.body.email || req.body.userName);
          removeOTPAttemptsKey(req, req.body.email || req.body.userName);
          removeTokenKey(req, req.body.email || req.body.userName);

          const roles = foundUser.AppRoles.map(
            (role: any) => role.roleName as AppRoleTypes
          );

          const permissions: AppPermissionType[] = foundUser.AppRoles.flatMap(
            (role: any) =>
              //@ts-ignore
              role.AppPermissions.map((permission) => ({
                permissionName: permission.permissionName,
                permissionEndPoint: permission.endPoint,
                permissionDescription: permission.description,
              }))
          );

          // Find Customer Name from Customer ID
          await setSchemaAndTimezone(pgB2Bpool);
          const queryForCustomerName =
            'SELECT customer_name FROM customers WHERE customer_id = $1';

          const customerNameRes = await pgB2Bpool.query(queryForCustomerName, [
            foundUser.customer_id,
          ]);

          const customer_name = customerNameRes.rows[0]['customer_name'];

          const userDetails = {
            id: String(foundUser.user_id),
            user_id: foundUser.user_id,
            customer_id: Number(foundUser.customer_id),
            customer_name: customer_name,
            firstName: foundUser.first_name,
            lastName: foundUser.last_name,
            userName: foundUser.username,
            email: foundUser.email,
            mobilePhone: foundUser.mobile_phone || '',
            authenticationType: foundUser.authentication_type,
            roles,
            permissions,
            two_factor_secret: foundUser.two_factor_secret,

            // Overwriting the toString method
            toString: function () {
              return `User ID: ${this.user_id}, Customer ID: ${this.customer_id}, Customer Name: ${this.customer_name}, Name: ${this.firstName} ${this.lastName}, Username: ${this.userName} Email: ${this.email}, Mobile Phone: ${this.mobilePhone}, Auth Type: ${this.authenticationType}`;
            },
          };

          // Without Roles Assigned - The user should not login
          if (userDetails?.roles.length === 0) {
            throw new Error(ErrorCode.NoRoleAssignedToUser);
          }

          logRequest.info(
            `Local User '${foundUser.username}' has been successfully authenticated (through password reset procedure)`
          );

          return userDetails;
        } catch (error: unknown) {
          const permittedErrorsToFrontEnd: string[] = [
            ErrorCode.EmailIsRequired,
            ErrorCode.IfAccountExistsYouWillReceivePasswordResetLink,
            ErrorCode.TotpJWTTokenRequired,
            ErrorCode.IncorrectPassResetTokenProvided,
            ErrorCode.CaptchaJWTTokenRequired,
            ErrorCode.TokenForEmailRequired,
            ErrorCode.NewPasswordRequired,
            ErrorCode.NoRoleAssignedToUser,
            ErrorCode.MaxOtpAttemptsRequested,
          ].map(String);

          if (
            error instanceof Error &&
            permittedErrorsToFrontEnd.includes(error.message)
          ) {
            logRequest.error(error.message);
            throw error;
          }
          // Handle other errors privately
          logRequest.error(error);
          throw new Error(ErrorCode.InternalServerError);
        }
      },
    }),
  ],
  pages: {
    signIn: '/signin', // Custom sign-in page
  },
  session: {
    strategy: 'jwt',
    maxAge: config.SessionMaxAge, // Session max age to XX minutes (in seconds)
    updateAge: config.SessionUpdateAge, // Session is refreshed every X minutes (in seconds)
  },
  jwt: {
    secret: process.env['NEXTAUTH_SECRET'],
  },
  secret: process.env['NEXTAUTH_SECRET'],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const customUser = user as User; // Explicitly cast to extended User type
        token.user_id = Number(customUser.user_id);
        token.customer_id = Number(customUser.customer_id);
        token.customer_name = customUser.customer_name;
        token.userName = customUser.userName;
        token.firstName = customUser.firstName;
        token.lastName = customUser.lastName;
        token.mobilePhone = customUser.mobilePhone;
        token.roles = customUser.roles;
        token.permissions = customUser.permissions;
        token.authenticationType = customUser.authenticationType;
      }

      // SECURE: Validate company switch on the server ⭐
      if (trigger === 'update' && session) {
        const logRequest = await getRequestLogger(TransportName.AUTH);

        // Only process if customer_id is being updated
        if (session.customer_id) {
          const newCustomerId = Number(session.customer_id);

          try {
            // Set schema and timezone for database query
            await setSchemaAndTimezone(pgB2Bpool);

            // CRITICAL: Verify that THIS SPECIFIC USER (by email AND current user_id context)
            // has a valid user record for the target company

            // Step 1: Get ALL user records for this email
            const allUserRecordsQuery = `
        SELECT DISTINCT 
          u.user_id, 
          u.username,
          u.first_name, 
          u.last_name, 
          u.mobile_phone,
          u.email,
          c.customer_id, 
          c.customer_name
        FROM users u
        INNER JOIN customers c ON u.customer_id = c.customer_id
        WHERE u.email = $1
          AND u.is_active = 'y'
          AND u.is_locked = 'n'
      `;

            const allRecords = await pgB2Bpool.query(allUserRecordsQuery, [
              token.email,
            ]);

            logRequest.info(
              `User email '${token.email}' has ${allRecords.rows.length} active company associations`
            );

            // Step 2: Verify the target company is in the user's allowed list
            const targetCompanyRecord = allRecords.rows.find(
              (record: any) => Number(record.customer_id) === newCustomerId
            );

            if (!targetCompanyRecord) {
              // SECURITY BREACH DETECTED
              logRequest.error(
                `SECURITY ALERT: User email '${
                  token.email
                }' (current user_id: ${
                  token.user_id
                }) attempted unauthorized company switch to ${newCustomerId}. Available companies: ${allRecords.rows
                  .map((r: any) => r.customer_id)
                  .join(', ')}`
              );

              // Keep the existing token unchanged - attack blocked
              return token;
            }

            // Step 3: User is authorized - get the specific user record for this company
            const validationQuery = `
        SELECT DISTINCT 
          u.user_id, 
          u.username,
          u.first_name, 
          u.last_name, 
          u.mobile_phone,
          u.email,
          c.customer_id, 
          c.customer_name
        FROM users u
        INNER JOIN customers c ON u.customer_id = c.customer_id
        WHERE u.email = $1
          AND c.customer_id = $2
          AND u.is_active = 'y'
          AND u.is_locked = 'n'
      `;

            const result = await pgB2Bpool.query(validationQuery, [
              token.email,
              newCustomerId,
            ]);

            if (result.rows.length === 0) {
              logRequest.error(
                `Unexpected error: Validation query returned no results for email '${token.email}' and company ${newCustomerId}`
              );
              return token;
            }

            const userData = result.rows[0];

            // Log the original user_id before switching
            const originalUserId = token.user_id;
            const originalCustomerId = token.customer_id;

            // Update basic user fields from database
            token.user_id = Number(userData.user_id);
            token.customer_id = Number(userData.customer_id);
            token.customer_name = userData.customer_name;
            token.userName = userData.username;
            token.firstName = userData.first_name;
            token.lastName = userData.last_name;
            token.mobilePhone = userData.mobile_phone || '';
            token.email = userData.email;

            // CRITICAL: Fetch roles and permissions for the NEW user_id
            const userWithRoles = await B2BUser.findOne({
              where: { user_id: userData.user_id },
              include: {
                model: AppRole,
                include: [AppPermission],
              },
            });

            if (userWithRoles) {
              // Update roles
              token.roles = userWithRoles.AppRoles.map(
                (role: any) => role.roleName as AppRoleTypes
              );

              // Update permissions
              token.permissions = userWithRoles.AppRoles.flatMap((role: any) =>
                role.AppPermissions.map((permission: any) => ({
                  permissionName: permission.permissionName,
                  permissionEndPoint: permission.endPoint,
                  permissionDescription: permission.description,
                }))
              );

              logRequest.info(
                `Roles and permissions updated for user_id ${
                  userData.user_id
                }: ${token.roles.join(', ')}`
              );
            } else {
              logRequest.warn(`No roles found for user_id ${userData.user_id}`);
              token.roles = [];
              token.permissions = [];
            }

            // Log the successful switch with full context
            logRequest.info(
              `JWT Update SUCCESS: Email '${token.email}' switched from [user_id: ${originalUserId}, company: ${originalCustomerId}] to [user_id: ${userData.user_id}, company: ${newCustomerId} (${token.customer_name})]`
            );
          } catch (error) {
            logRequest.error(
              `JWT Update Error for email ${token.email}: ${error}`
            );

            // On error, keep existing token unchanged
          }
        }
      }

      // Add expiration time to the token
      if (token) {
        token.exp = Math.floor(Date.now() / 1000) + config.SessionMaxAge; // 1 hour expiration
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.user_id = Number(token.user_id);
        session.user.customer_id = Number(token.customer_id);
        session.user.customer_name = token.customer_name;
        session.user.userName = token.userName;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.mobilePhone = token.mobilePhone;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
        session.user.authenticationType = token.authenticationType;
        session.expiresAt = token.exp;
      }
      return session;
    },
  },
};

// Extend User and JWT interfaces
declare module 'next-auth' {
  interface User extends DefaultUser {
    user_id: number;
    customer_id: number;
    customer_name: string;
    userName: string;
    firstName: string;
    lastName: string;
    mobilePhone: string;
    roles: AppRoleTypes[];
    permissions: AppPermissionType[];
    authenticationType: string;
  }

  interface Session {
    user: User;
    expiresAt: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user_id: number;
    customer_id: number;
    customer_name: string;
    userName: string;
    firstName: string;
    lastName: string;
    mobilePhone: string;
    roles: AppRoleTypes[];
    permissions: AppPermissionType[];
    authenticationType: string;
    exp: number;
  }
}
