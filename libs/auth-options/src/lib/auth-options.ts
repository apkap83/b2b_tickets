import * as Yup from 'yup';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { config } from '@b2b-tickets/config';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import {
  AppPermission,
  AppRole,
  B2BUser,
  pgB2Bpool,
  setSchema,
} from '@b2b-tickets/db-access';

// import ldap from 'ldapjs'; // ME GAMHSES PATOKORFA LDAPJS!
import { Client, SearchOptions } from 'ldapts';

import { createUserIfNotExistsAfterLDAPSuccessfullAuth } from '@b2b-tickets/admin-server-actions';
import { validateReCaptcha } from '@b2b-tickets/server-actions';

// import { logAuth } from '@b2b-tickets/logging';

import { headers } from 'next/headers';
import { strategy } from 'sharp';
import { signIn } from 'next-auth/react';
type CredentialsType = Record<'userName' | 'password', string> | undefined;

const tryLocalAuthentication = async (credentials: CredentialsType) => {
  const headersList = headers();
  const reqIP = headersList.get('request-ip');
  const reqURL = headersList.get('request-url');
  try {
    // logAuth.info(
    //   `Trying Local authentication for user name: ${credentials.userName}`,
    //   {
    //     reqIP,
    //     reqURL,
    //   }
    // );
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

    if (foundUser) {
      // logAuth.debug(
      //   `User with user name '${foundUser.userName}' was found in DB`,
      //   {
      //     reqIP,
      //     reqURL,
      //   }
      // );

      if (foundUser.is_locked === 'y') {
        throw new Error('User is currently locked');
      }

      const match = await bcrypt.compare(
        credentials!.password,
        foundUser.password
      );

      if (match) {
        // logAuth.debug(`Given password and DB passwords match`, {
        //   reqIP,
        //   reqURL,
        // });
        delete foundUser.password;

        const roles = foundUser.AppRoles.map((role) => role.roleName);

        const permissions = foundUser.AppRoles.flatMap((role) =>
          role.AppPermissions.map((permission) => ({
            permissionName: permission.permissionName,
            permissionEndPoint: permission.endPoint,
            permissionDescription: permission.description,
          }))
        );

        const plainUser = foundUser.toJSON();
        delete plainUser.password;
        // logAuth.debug(`Found User in DB: ${JSON.stringify(plainUser)}`, {
        //   reqIP,
        //   reqURL,
        // });

        // Find Customer Name from Customer ID
        await setSchema(pgB2Bpool, config.postgres_b2b_database.schemaName);
        const queryForCustomerName =
          'SELECT customer_name FROM customers WHERE customer_id = $1';
        const customerNameRes = await pgB2Bpool.query(queryForCustomerName, [
          foundUser.customer_id,
        ]);

        const customer_name = customerNameRes.rows[0]['customer_name'];
        console.log('*** foundUser', foundUser);
        return [
          foundUser.is_active,
          {
            user_id: foundUser.user_id,
            customer_id: foundUser.customer_id,
            customer_name: customer_name,
            firstName: foundUser.first_name,
            lastName: foundUser.last_name,
            userName: foundUser.username,
            email: foundUser.email,
            mobilePhone: foundUser.mobile_phone,
            authenticationType: foundUser.authentication_type,
            roles,
            permissions,
          },
        ];
      }
    }
  } catch (error: any) {
    // logAuth.error(error, {
    //   reqIP,
    //   reqURL,
    // });
    throw new Error(error);
  }
  return [undefined, null];
};

export const options = {
  providers: [
    Credentials({
      name: 'Local & LDAP Authentication',
      credentials: {
        userName: {
          label: 'User Name',
          type: 'text',
          placeholder: '',
          value: 'admin',
        },
        password: { label: 'Password', type: 'password', value: 'a12345' },
      },
      async authorize(credentials, req) {
        const headersList = headers();
        const reqIP = headersList.get('request-ip');
        const reqURL = headersList.get('request-url');

        if (!credentials) return null;

        try {
          const validationSchema = Yup.object({
            userName: Yup.string().required('User name is required'),
            password: Yup.string().required('Password is required'),
          });
          await validationSchema.validate(credentials, { abortEarly: false });
        } catch (error: any) {
          // logAuth.error(error, {
          //   reqIP,
          //   reqURL,
          // });
          throw new Error(error.errors.join(', '));
        }

        // For Local Account (Authentication Type = LOCAL) - Try to authenticate
        const [localAccountActive, localAuthUserDetails] =
          await tryLocalAuthentication(credentials);

        if (localAuthUserDetails) {
          if (localAccountActive === 'n') {
            // logAuth.info(`User '${credentials.userName}' is currently locked`, {
            //   reqIP,
            //   reqURL,
            // });
            throw new Error('User is currently locked');
          }

          // localAuthUserDetails
          //   id: '2',
          //   firstName: 'Administrator',
          //   lastName: 'Administrator',
          //   userName: 'admin',
          //   email: 'nms_system_support@nova.gr',
          //   authenticationType: 'LOCAL',
          //   roles: [ 'Admin' ],
          //   permissions: [
          //     {
          //       permissionName: 'API_Admin',
          //       permissionEndPoint: null,
          //       permissionDescription: 'Full Access for All API Endpoints'
          //     },
          //     {
          //       permissionName: 'API_Security_Management',
          //       permissionEndPoint: null,
          //       permissionDescription: 'Full Access for All Security Endpoints'
          //     }
          //   ]
          // }

          return new Promise((resolve, reject) => {
            // logAuth.info(
            //   `Local User '${credentials.userName}' has been successfully authanticated`,
            //   {
            //     reqIP,
            //     reqURL,
            //   }
            // );
            resolve(localAuthUserDetails);
          });
        }
        throw new Error('Invalid credentials');
      },
    }),
  ],
  redirect: false,
  pages: {
    signIn: '/signin', // Custom sign-in page
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // Session max age to 60 minutes (in seconds)
    updateAge: 5 * 60, // Session is refreshed every 5 minutes (in seconds)
  },
  callbacks: {
    async signIn({ credentials }) {
      // Get the reCAPTCHA token from the credentials
      const captchaToken = credentials.captchaToken;

      try {
        const reCaptchaValidResponse = await validateReCaptcha(captchaToken);

        if (!reCaptchaValidResponse) {
          throw new Error('reCAPTCHA validation failed');
        }

        // Proceed with login after successful reCAPTCHA validation
        return true;
      } catch (error) {
        console.error('reCAPTCHA validation error:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.user_id = user.user_id;
        token.customer_id = user.customer_id;
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
        session.user.user_id = token.user_id;
        session.user.customer_id = token.customer_id;
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
