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

    const foundUser = await B2BUser.scope('withPassword').findOne({
      where: getWhereObj(credentials, emailProvided),
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    });

    if (!foundUser) {
      logRequest.error(`Incorrect user name provided`);

      // Introduce a 1500ms delay before returning error response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    if (foundUser.is_locked === 'y') {
      logRequest.error(
        `User with user name '${foundUser.username}' is currently locked`
      );
      throw new Error(ErrorCode.UserIsLocked);
    }

    if (foundUser.is_active !== 'y') {
      logRequest.error(
        `User with user name '${foundUser.username}' is not currently active`
      );

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
              sendOTP(localAuthUserDetails.userName, newOTP!);
            }

            // Require OTP From The User
            throw new Error(ErrorCode.SecondFactorRequired);
          }

          // TODO
          // If User is 'admin' himself then allow ANY OTP Code
          if (localAuthUserDetails.userName === 'admin') {
            logRequest.info(
              'Allowing admin user to have access with ANY OTP code'
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
          removeOTPAttemptsKey(req, req.body.userName);
          removeTokenKey(req, req.body.userName);

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
          const { email, tokenForEmail, newPassword } = credentials;

          // Validate JWT Token for Captcha Validation
          if (config.CaptchaIsActiveForPasswordReset) {
            // verifyJWTCaptcha({ req });
            // Recaptcha response
            const data = await validateReCaptchaV3(credentials.captchaToken);
            if (!data) {
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            }
            if (!data.success || data.score < config.CaptchaV3Threshold) {
              logRequest.info('Captcha v3 Data:', data);
              throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
            }
          }

          if (!email) {
            throw new Error(ErrorCode.EmailIsRequired);
          }

          // Validate JWT Token for Captcha Validation
          // if (config.CaptchaIsActiveForPasswordReset) {
          //   verifyJWTCaptcha({ req });
          // }

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
              foundUser.username
            );
            if (maxOTPsReached) {
              throw new Error(ErrorCode.MaxOtpAttemptsRequested);
            }

            // Generate and store in Redis the New OTP Code
            const newOTP = await generateAndRedisStoreNewOTPForUser(
              req,
              foundUser.username
            );

            if (newOTP) {
              // SEND OTP HERE
              logRequest.info(`'*** OTP Code for Pass Reset: ${newOTP}`);
              await sendOTP(foundUser.username, newOTP!);
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

          foundUser.password = newPassword;
          await foundUser.save();

          // After Successful Password Change - Remove OTP Key & Attempts & Token
          removeOTPKey(req, req.body.email);
          removeOTPAttemptsKey(req, req.body.email);
          removeTokenKey(req, req.body.email);

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
    async jwt({ token, user }) {
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
