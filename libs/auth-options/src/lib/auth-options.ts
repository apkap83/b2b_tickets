import Credentials from 'next-auth/providers/credentials';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import { sequelize } from '@b2b-tickets/db-access';
import bcrypt from 'bcryptjs';
import * as Yup from 'yup';
// import ldap from 'ldapjs'; // ME GAMHSES PATOKORFA LDAPJS!
import { Client } from 'ldapts';

import { createUserIfNotExistsAfterLDAPSuccessfullAuth } from '@b2b-tickets/admin-server-actions';

// import { logAuth } from '@b2b-tickets/logging';

import { headers } from 'next/headers';

const { AppUser, AppRole, AppPermission } = sequelize.models;
const tryLocalAuthentication = async (credentials) => {
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
    const foundUser = await AppUser.scope('withPassword').findOne({
      where: {
        userName: credentials.userName,
        authenticationType: AuthenticationTypes.LOCAL,
      },
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    });

    if (foundUser) {
      // logAuth.debug(
      //   `User with user name '${foundUser.userName}' was found in DB`,
      //   {
      //     reqIP,
      //     reqURL,
      //   }
      // );
      const match = await bcrypt.compare(
        credentials.password,
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

        return [
          foundUser.active,
          {
            id: foundUser.id,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            userName: foundUser.userName,
            email: foundUser.email,
            authenticationType: foundUser.authenticationType,
            roles,
            permissions,
          },
        ];
      }
    }
  } catch (error) {
    // logAuth.error(error, {
    //   reqIP,
    //   reqURL,
    // });
    throw new Error(error);
  }
  return [undefined, null];
};

const tryLocalLDAPAuthentication = async (credentials) => {
  console.log('Trying LDAP Auth...');
  const headersList = headers();
  const reqIP = headersList.get('request-ip');
  const reqURL = headersList.get('request-url');
  try {
    // logAuth.info(
    //   'Trying Local LDAP authentication for user name: ' + credentials.userName,
    //   {
    //     reqIP,
    //     reqURL,
    //   }
    // );
    const foundUser = await AppUser.findOne({
      where: {
        userName: credentials.userName,
        authenticationType: AuthenticationTypes.LDAP,
      },
      include: {
        model: AppRole,
        include: [AppPermission],
      },
    });

    if (foundUser) {
      // logAuth.info(
      //   `LDAP User with user name '${foundUser.userName}' was found in Local DB`,
      //   {
      //     reqIP,
      //     reqURL,
      //   }
      // );

      console.log('138 found user');
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
      // logAuth.debug(
      //   `Found LDAP User in Local DB: ${JSON.stringify(plainUser)}`,
      //   {
      //     reqIP,
      //     reqURL,
      //   }
      // );

      return [
        foundUser.active,
        {
          id: foundUser.id,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          userName: foundUser.userName,
          email: foundUser.email,
          authenticationType: foundUser.authenticationType,
          roles,
          permissions,
        },
      ];
    }
  } catch (error) {
    // logAuth.error(error);
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
        try {
          const validationSchema = Yup.object({
            userName: Yup.string().required('User name is required'),
            password: Yup.string().required('Password is required'),
          });
          await validationSchema.validate(credentials, { abortEarly: false });
        } catch (error) {
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
          if (!localAccountActive) {
            // logAuth.info(`User '${credentials.userName}' is currently locked`, {
            //   reqIP,
            //   reqURL,
            // });
            throw new Error('User is currently locked');
          }

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

        // For Local LDAP Account (Authentication Type = LOCAL) - Try to authenticate
        const [ldapAccountActive, localLDAPAccountUserDetails] =
          await tryLocalLDAPAuthentication(credentials);

        if (localLDAPAccountUserDetails) {
          if (!ldapAccountActive) {
            // logAuth.info(`User '${credentials.userName}' is currently locked`, {
            //   reqIP,
            //   reqURL,
            // });
            throw new Error('User is currently locked');
          }
        }

        const client = new Client({
          url: process.env.LDAP_URI,
          timeout: 0,
          connectTimeout: 0,
          strictDN: true,
        });

        try {
          const bindDN = `sys\\${credentials.userName.replace('sys\\', '')}`;
          const searchBase = 'OU=End Users,DC=sys,DC=telestet,DC=gr';

          // Bind to the LDAP server
          try {
            await client.bind(bindDN, credentials.password);
            // logAuth.info(
            //   `LDAP Authentication Successful for user '${credentials.userName}'`,
            //   {
            //     reqIP,
            //     reqURL,
            //   }
            // );
          } catch (err) {
            // logAuth.error(
            //   new Error(
            //     `Invalid credentials for provided user name ${credentials.userName} or LDAP connection error`
            //   ),
            //   {
            //     reqIP,
            //     reqURL,
            //   }
            // );

            throw new Error('Invalid credentials');
          }

          // Search options
          const opts = {
            filter: `(&(objectClass=*)(sAMAccountName=${credentials.userName.replace(
              'sys\\',
              ''
            )}))`,
            scope: 'sub',
            attributes: [
              'cn',
              'sn',
              'userPrincipalName',
              'memberOf',
              'sAMAccountName',
              'givenName',
              'mobile',
            ],
            paged: true,
            sizeLimit: 200,
          };

          // Search in the LDAP server
          const { searchEntries } = await client.search(searchBase, opts);

          if (searchEntries.length === 0) {
            throw new Error('User not found');
          }

          const entry = searchEntries[0];

          let firstName =
            entry.givenName.charAt(0).toUpperCase() +
            entry.givenName.slice(1).toLowerCase();
          let lastName =
            entry.sn.charAt(0).toUpperCase() + entry.sn.slice(1).toLowerCase();
          let userName = entry.sAMAccountName.toLowerCase();
          let email = entry.userPrincipalName.toLowerCase();
          let mobilePhone = entry.mobile;

          const user = {
            firstName,
            lastName,
            userName,
            password: credentials.password,
            email,
            mobilePhone,
          };

          if (!localLDAPAccountUserDetails)
            // logAuth.info(
            //   `Creating New LDAP account in Local DB for user '${credentials.userName}'`,
            //   {
            //     reqIP,
            //     reqURL,
            //   }
            // );
            await createUserIfNotExistsAfterLDAPSuccessfullAuth(user);

          return new Promise((resolve, reject) =>
            resolve({
              id: 1,
              firstName,
              lastName,
              userName,
              email,
              roles: localLDAPAccountUserDetails?.roles || [],
              permissions: localLDAPAccountUserDetails?.permissions || [],
              authenticationType: AuthenticationTypes.LDAP,
            })
          );
        } catch (err) {
          // logAuth.error(err, {
          //   reqIP,
          //   reqURL,
          // });
          throw new Error('Invalid credentials');
        } finally {
          await client.unbind();
        }
      },
    }),
  ],
  redirect: false,
  pages: {
    signIn: '/signin', // Custom sign-in page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userName = user.userName;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.authenticationType = user.authenticationType;
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.userName = token.userName;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
        session.user.authenticationType = token.authenticationType;
      }
      return session;
    },
  },
};
