import Credentials from 'next-auth/providers/credentials';
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
} from '@b2b-tickets/shared-models';
import {
  AppPermission,
  AppRole,
  B2BUser,
  pgB2Bpool,
  setSchema,
} from '@b2b-tickets/db-access';
import { CustomLogger } from '@b2b-tickets/logging';

import { validateReCaptcha } from '@b2b-tickets/server-actions';
import { createRequestLogger } from '@b2b-tickets/logging';
import { headers } from 'next/headers';
import { NextAuthOptions } from 'next-auth';

// Set the length to 4 digits and 120 seconds
authenticator.options = {
  digits: config.TwoFactorDigitsLength,
  step: config.TwoFactorValiditySeconds,
};

// Extend User and JWT interfaces
declare module 'next-auth' {
  interface User {
    user_id: number;
    customer_id: number;
    customer_name: string;
    userName: string;
    firstName: string;
    lastName: string;
    mobilePhone: string;
    roles: string[];
    permissions: any[];
    authenticationType: string;
  }

  interface Session {
    user: User;
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
    roles: string[];
    permissions: any[];
    authenticationType: string;
  }
}

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

  logRequest.info(
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
  const headersList = headers();
  const reqIP = headersList.get('request-ip');
  const reqURL = headersList.get('request-url');
  const sessionId = headersList.get('session-id');

  try {
    logRequest.info(
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
      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    if (foundUser.is_locked === 'y') {
      logRequest.info(
        `User with user name '${foundUser.username}' is currently locked`
      );
      throw new Error(ErrorCode.UserIsLocked);
    }

    if (foundUser.is_active !== 'y') {
      logRequest.info(
        `User with user name '${foundUser.username}' is not currently active`
      );

      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    const match = await bcrypt.compare(
      credentials!.password,
      foundUser.password
    );

    if (!match) {
      logRequest.info(`Incorrect password provided`);

      throw new Error(ErrorCode.IncorrectUsernameOrPassword);
    }

    logRequest.debug(`Given password and DB passwords match`);

    const roles = foundUser.AppRoles.map((role) => role.roleName);

    const permissions = foundUser.AppRoles.flatMap((role) =>
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

    logRequest.debug(`Logged In User Details: ${userDetails}`);

    return userDetails;
  } catch (error: any) {
    logRequest.error(error);
    throw new Error(error);
  }
};

export const options: NextAuthOptions = {
  providers: [
    Credentials({
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
      async authorize(credentials, req) {
        const headersList = headers();
        const reqIP = headersList.get('request-ip');
        const reqURL = headersList.get('request-url');
        const sessionId = headersList.get('session-id');

        // Create a logger that automatically includes reqIP, reqURL, and sessionId
        const logRequest = createRequestLogger(
          TransportName.AUTH,
          reqIP,
          reqURL,
          sessionId
        );

        if (!credentials?.userName)
          throw new Error(ErrorCode.NoCredentialsProvided);
        if (!credentials?.password)
          throw new Error(ErrorCode.NoCredentialsProvided);

        // reCAPTCHA VALIDATION FIRST
        if (config.CaptchaIsActive && credentials.totpCode === '') {
          const captchaToken = credentials.captchaToken;
          const reCaptchaSuccessResponse = await validateReCaptcha(
            captchaToken
          );
          if (!reCaptchaSuccessResponse) {
            logRequest.error(
              `reCAPTCHA backend validation error for user ${credentials.userName}`
            );
            throw new Error(ErrorCode.CaptchaValidationFailed);
          }
        }
        const localAuthUserDetails = await tryLocalAuthentication(
          credentials,
          logRequest
        );

        if (!localAuthUserDetails) {
          logRequest.error(
            'LocalAuthUserDetails object from Local Authentication is not valid'
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

        if (!credentials.totpCode) {
          logRequest.info(
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

        const isValidToken = authenticator.check(credentials.totpCode, secret);
        if (!isValidToken) {
          logRequest.error(`Invalid Token Provided`);
          throw new Error(ErrorCode.IncorrectTwoFactorCode);
        }

        logRequest.info(
          `Local User '${credentials.userName}' has been successfully authenticated`
        );
        return localAuthUserDetails;
      },
    }),
  ],
  pages: {
    signIn: '/signin', // Custom sign-in page
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // Session max age to 60 minutes (in seconds)
    updateAge: 5 * 60, // Session is refreshed every 5 minutes (in seconds)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user_id = Number(user.user_id);
        token.customer_id = Number(user.customer_id);
        token.customer_name = user.customer_name;
        token.userName = user.userName;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.mobilePhone = user.mobilePhone;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.authenticationType = user.authenticationType;
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
      }
      return session;
    },
  },
};
