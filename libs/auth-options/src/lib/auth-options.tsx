export type { Session } from 'next-auth';
import { User, DefaultUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { NextApiResponse } from 'next';
import {
  symmetricEncrypt,
  symmetricDecrypt,
  generateOtpCode,
} from '@b2b-tickets/utils';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import { config } from '@b2b-tickets/config';
import {
  AuthenticationTypes,
  ErrorCode,
  TransportName,
  AppPermissionType,
  AppRoleTypes,
} from '@b2b-tickets/shared-models';
import {
  AppPermission,
  AppRole,
  B2BUser,
  pgB2Bpool,
  setSchema,
} from '@b2b-tickets/db-access';

import { NextAuthOptions } from 'next-auth';
import jwt from 'jsonwebtoken';

// utils/requestLogger.ts - used for server-side only
import { headers } from 'next/headers';
import { createRequestLogger } from '@b2b-tickets/logging';
import { CustomLogger } from '@b2b-tickets/logging';
import { generateResetToken } from '@b2b-tickets/utils';

export function getRequestLogger(transportName: TransportName) {
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use an environment variable in production

// Set the length to 4 digits and 120 seconds
authenticator.options = {
  digits: config.TwoFactorDigitsLength,
  step: config.TwoFactorValiditySeconds,
};

// // Extend User and JWT interfaces
// declare module 'next-auth' {
//   interface User {
//     user_id: number;
//     customer_id: number;
//     customer_name: string;
//     userName: string;
//     firstName: string;
//     lastName: string;
//     mobilePhone: string;
//     roles: AppRoleTypes[];
//     permissions: AppPermissionType[];
//     authenticationType: string;
//   }

//   interface Session {
//     user: User;
//     expiresAt: number;
//   }
// }

// declare module 'next-auth/jwt' {
//   interface JWT {
//     user_id: number;
//     customer_id: number;
//     customer_name: string;
//     userName: string;
//     firstName: string;
//     lastName: string;
//     mobilePhone: string;
//     roles: string[];
//     permissions: any[];
//     authenticationType: string;
//     exp: number;
//   }
// }

type CredentialsType = Record<'userName' | 'password', string> | undefined;

export const generateTwoFactorSecretForUserId = async (
  userId: number,
  logRequest: CustomLogger
) => {
  if (!process.env['ENCRYPTION_KEY']!) {
    logRequest.error(
      `Missing 'ENCRYPTION_KEY' environment variable, cannot proceed with two factor login.`
    );
    throw new Error(ErrorCode.InternalServerError);
  }

  const foundUser = (await B2BUser.scope('withPassword').findOne({
    where: {
      user_id: userId,
    },
  })) as B2BUser;

  logRequest.debug(
    `Generating Random Two Factor Secret for user ${foundUser.username}`
  );

  const newSecret = authenticator.generateSecret();
  const encryptedSecret = symmetricEncrypt(
    newSecret,
    process.env['ENCRYPTION_KEY']!
  );

  foundUser.two_factor_secret = encryptedSecret;
  await foundUser.save();

  return encryptedSecret;
};

const tryLocalAuthentication = async (
  credentials: CredentialsType,
  logRequest: CustomLogger
) => {
  try {
    logRequest.debug(
      `Trying Local authentication for user name: ${
        credentials ? credentials.userName : 'Not Given'
      }`
    );
    const foundUser = (await B2BUser.scope('withPassword').findOne({
      where: {
        username: credentials!.userName,
        authentication_type: AuthenticationTypes.LOCAL,
      },
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    })) as B2BUser & { AppRoles: AppRole[] };

    if (!foundUser) {
      logRequest.error(`Incorrect user name provided`);
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
      (role) => role.roleName as AppRoleTypes
    );

    const permissions: AppPermissionType[] = foundUser.AppRoles.flatMap(
      (role) =>
        //@ts-ignore
        role.AppPermissions.map((permission) => ({
          permissionName: permission.permissionName,
          permissionEndPoint: permission.endPoint,
          permissionDescription: permission.description,
        }))
    );

    // Find Customer Name from Customer ID
    await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
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

    logRequest.debug(`Valid User Name/Password was provided`);

    return userDetails;
  } catch (error: unknown) {
    logRequest.error(error);
    throw error;
  }
};

export const options: NextAuthOptions = {
  providers: [
    Credentials({
      id: 'credentials-login',
      name: 'Local & LDAP Authentication',
      credentials: {
        userName: {
          label: 'User Name',
          type: 'text',
          placeholder: '',
        },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'captchaToken', type: 'text' },
        totpCode: { label: 'Time-Based One-Time Password', type: 'text' },
      },
      async authorize(credentials: any, req: any) {
        const logRequest: CustomLogger = getRequestLogger(TransportName.AUTH);
        try {
          if (!credentials?.userName || !credentials?.password) {
            throw new Error(ErrorCode.NoCredentialsProvided);
          }

          // Validate JWT Token for Captcha Validation
          if (config.CaptchaIsActive) {
            verifyJWTCaptcha({ req });
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

          // Without Two Factor Authentication The User is Now Authenticated
          if (!config.TwoFactorEnabled) {
            logRequest.info(
              `Local User '${credentials.userName}' has been successfully authenticated`
            );
            return localAuthUserDetails;
          }

          logRequest.debug(
            `Requesting OTP Autentication from user ${localAuthUserDetails.userName}`
          );

          let newlyGeneratedSecret: string | undefined = undefined;
          let correctOTPCode: string | undefined = undefined;

          // if Two Factor Secret does not exist then generate it
          if (!localAuthUserDetails.two_factor_secret) {
            newlyGeneratedSecret = await generateTwoFactorSecretForUserId(
              localAuthUserDetails.user_id,
              logRequest
            );
          }

          // Secret Already Exists
          if (newlyGeneratedSecret == undefined) {
            correctOTPCode = generateOtpCode(
              localAuthUserDetails.two_factor_secret!
            );
          }

          // Secret was just created
          if (newlyGeneratedSecret !== undefined) {
            correctOTPCode = generateOtpCode(newlyGeneratedSecret);
          }

          // SEND SMS HERE
          logRequest.info(`'*** OTP Code: ${correctOTPCode}`);

          if (!credentials.totpCode) {
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

          // Validate OTP
          const secret = symmetricDecrypt(
            localAuthUserDetails.two_factor_secret!,
            process.env.ENCRYPTION_KEY!
          );

          const isValidToken = authenticator.check(
            credentials.totpCode,
            secret
          );
          if (!isValidToken) {
            logRequest.error(
              `Invalid Token Provided -> ${credentials.totpCode}`
            );
            throw new Error(ErrorCode.IncorrectTwoFactorCode);
          }

          logRequest.info(
            `Local User '${credentials.userName}' has been successfully authenticated`
          );
          return localAuthUserDetails;
        } catch (error: unknown) {
          const suppressErrorObjectForErrors: string[] = [
            ErrorCode.SecondFactorRequired,
            ErrorCode.IncorrectTwoFactorCode,
            ErrorCode.IncorrectUsernameOrPassword,
            ErrorCode.CaptchaValidationFailed,
          ].map(String);

          if (error instanceof Error) {
            if (suppressErrorObjectForErrors.includes(error.message)) {
              logRequest.error(error.message);
            } else {
              // Handle other errors
              logRequest.error(error);
            }
          }

          throw error;
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
        tokenForEmail: {
          label: 'Token',
          type: 'text',
          placeholder: 'Your token',
        },
        newPassword: { label: 'newPassword', type: 'text' },
      },
      async authorize(credentials: any, req: any) {
        const logRequest: CustomLogger = getRequestLogger(TransportName.AUTH);
        try {
          const { email, tokenForEmail, newPassword } = credentials;

          if (!email) {
            throw new Error(ErrorCode.EmailIsRequired);
          }

          // Validate JWT Token for Captcha Validation
          if (config.CaptchaIsActiveForPasswordReset) {
            verifyJWTCaptcha({ req });
          }

          const foundUser = (await B2BUser.findOne({
            where: {
              email,
            },
            include: {
              model: AppRole,
              include: [AppPermission],
            },
          })) as B2BUser & { AppRoles: AppRole[] };

          if (!foundUser) {
            logRequest.error(
              'Incorrect E-mail provided for Password Reset Procedure'
            );
            throw new Error(ErrorCode.IncorrectEmailProvided);
          }

          if (config.TwoFactorEnabledForPasswordReset) {
            let newlyGeneratedSecret: string | undefined = undefined;
            let correctOTPCode: string | undefined = undefined;

            // if Two Factor Secret does not exist then generate it
            if (!foundUser.two_factor_secret) {
              newlyGeneratedSecret = await generateTwoFactorSecretForUserId(
                foundUser.user_id,
                logRequest
              );
            }

            // Secret Already Exists
            if (newlyGeneratedSecret == undefined) {
              correctOTPCode = generateOtpCode(foundUser.two_factor_secret!);
            }

            // Secret was just created
            if (newlyGeneratedSecret !== undefined) {
              correctOTPCode = generateOtpCode(newlyGeneratedSecret);
            }

            // SEND SMS HERE
            logRequest.info(`'*** OTP Code for Pass Reset: ${correctOTPCode}`);

            verifyJWTTotp({ req });
          }

          if (!tokenForEmail) {
            throw new Error(ErrorCode.TokenForEmailRequired);
          }

          verifyJWTTokenForEmail({
            req,
            tokenProvidedFromUser: tokenForEmail,
          });

          if (!newPassword) {
            throw new Error(ErrorCode.NewPasswordRequired);
          }

          // Verify Complexity
          // try {
          // @ts-ignore
          foundUser.password = newPassword;

          await foundUser.save();

          throw new Error(ErrorCode.PasswordSuccesffullyChanged);
          // } catch (error) {
          //   throw new Error(ErrorCode.PasswordDoesNotMeetComplexity);
          // }

          const roles = foundUser.AppRoles.map(
            (role) => role.roleName as AppRoleTypes
          );

          const permissions: AppPermissionType[] = foundUser.AppRoles.flatMap(
            (role) =>
              //@ts-ignore
              role.AppPermissions.map((permission) => ({
                permissionName: permission.permissionName,
                permissionEndPoint: permission.endPoint,
                permissionDescription: permission.description,
              }))
          );

          // Find Customer Name from Customer ID
          await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
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

          return userDetails;
        } catch (error: unknown) {
          const suppressErrorObjectForErrors: string[] = [
            ErrorCode.EmailIsRequired,
            ErrorCode.IncorrectEmailProvided,
            ErrorCode.TotpJWTTokenRequired,
            ErrorCode.IncorrectPassResetTokenProvided,
            ErrorCode.CaptchaJWTTokenRequired,
            ErrorCode.TokenForEmailRequired,
            ErrorCode.IncorrectPassResetTokenProvided,
            ErrorCode.NewPasswordMatchesOld,
            ErrorCode.NoPasswordProvided,
            ErrorCode.PasswordDoesNotMeetComplexity,
            ErrorCode.NewPasswordRequired,
            ErrorCode.PasswordSuccesffullyChanged,
          ].map(String);

          if (error instanceof Error) {
            if (suppressErrorObjectForErrors.includes(error.message)) {
              logRequest.error(error.message);
            } else {
              // Handle other errors
              logRequest.error(error);
            }
          }

          throw error;
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

function verifyJWTCaptcha({ req }: { req: any }) {
  const cookies = req.headers?.cookie || '';
  const captchaJWTToken = cookies.match(/captchaJWTToken=([^;]+)/)?.[1];

  if (!captchaJWTToken) {
    throw new Error(ErrorCode.CaptchaJWTTokenRequired);
  }

  // Verify the JWT token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(captchaJWTToken, JWT_SECRET);
    //@ts-ignore
    if (!decoded.captchaValidated)
      throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
  } catch (error) {
    // Handle invalid token error (expired, tampered with, etc.)
    throw new Error(ErrorCode.CaptchaJWTTokenInvalid);
  }
}

function verifyJWTTotp({ req }: { req: any }) {
  const cookies = req.headers?.cookie || '';
  const totpJWTToken = cookies.match(/totpJWTToken=([^;]+)/)?.[1];

  if (!totpJWTToken) {
    throw new Error(ErrorCode.TotpJWTTokenRequired);
  }

  // Verify the JWT token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(totpJWTToken, JWT_SECRET);
    //@ts-ignore
    if (!decoded.otpValidatedForEmailAddress)
      throw new Error(ErrorCode.TotpJWTTokenInvalid);
  } catch (error) {
    // Handle invalid token error (expired, tampered with, etc.)
    throw new Error(ErrorCode.TotpJWTTokenInvalid);
  }
}

function verifyJWTTokenForEmail({
  req,
  tokenProvidedFromUser,
}: {
  req: any;
  tokenProvidedFromUser: string;
}) {
  const cookies = req.headers?.cookie || '';
  const emailJWTToken = cookies.match(/emailJWTToken=([^;]+)/)?.[1];

  if (!emailJWTToken) {
    throw new Error(ErrorCode.EmailJWTTokenRequired);
  }

  // Verify the JWT token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(emailJWTToken, JWT_SECRET);
    //@ts-ignore
    if (!decoded.token)
      throw new Error(ErrorCode.IncorrectPassResetTokenProvided);

    // Decrypt token in JWT
    const decryptedToken = symmetricDecrypt(
      //@ts-ignore
      decoded.token,
      //@ts-ignore
      process.env['ENCRYPTION_KEY']
    );

    if (decryptedToken !== tokenProvidedFromUser)
      throw new Error(ErrorCode.IncorrectPassResetTokenProvided);
  } catch (error) {
    // Handle invalid token error (expired, tampered with, etc.)
    throw new Error(ErrorCode.IncorrectPassResetTokenProvided);
  }
}

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
