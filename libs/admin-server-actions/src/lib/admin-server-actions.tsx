'use server';

import { options, Session } from '@b2b-tickets/auth-options';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import * as yup from 'yup';
import {
  sequelize,
  AppUser,
  AppPermission,
  AppRole,
  B2BUser,
  pgB2Bpool,
  setSchemaAndTimezone,
} from '@b2b-tickets/db-access';
import { revalidatePath } from 'next/cache';
import {
  fromErrorToFormState,
  toFormState,
  userHasPermission,
  userHasRole,
} from '@b2b-tickets/utils';
import { config } from '@b2b-tickets/config';

import {
  AppRoleTypes,
  AppPermissionTypes,
  AuthenticationTypes,
} from '@b2b-tickets/shared-models';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { syncDatabase, syncDatabaseAlterTrue } from '@b2b-tickets/db-access';
import {
  CustomLogger,
  getRequestLogger,
} from '@b2b-tickets/server-actions/server';
import { TransportName } from '@b2b-tickets/shared-models';

const logRequest: CustomLogger = getRequestLogger(TransportName.ACTIONS);

const verifySecurityPermission = async (
  permissionName: AppPermissionTypes | AppPermissionTypes[]
) => {
  try {
    const session = await getServerSession(options);

    if (!session || !session.user) {
      throw new Error('Unauthenticated or missing user information');
    }

    if (!userHasPermission(session, permissionName)) {
      throw new Error(
        'Unauthorized access: User is not authorized for this action'
      );
    }

    // Return the session if authorized
    return session;
  } catch (error) {
    throw error;
  }
};

const verifySecurityRole = async (roleName: AppRoleTypes | AppRoleTypes[]) => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      throw new Error('Unauthenticated user');
    }

    if (userHasRole(session, roleName)) {
      throw new Error(
        'Unauthorized access: User is not authorized for this action'
      );
    }

    // Return the session if authorized
    return session;
  } catch (error) {
    throw error;
  }
};

export const getCustomersList = async () => {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    const getList = 'SELECT customer_id, customer_name from customers';
    const customersList = await pgB2Bpool.query(getList);

    return customersList.rows;
  } catch (error) {
    console.log('ERROR:', error);
  }
};

export const getAdminDashboardData = async () => {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    // TODO Uncomment
    // await checkAuthenticationAndAdminRole();

    const queryForUsersWithCustomer =
      'SELECT * FROM users as U INNER JOIN customers as C on U.customer_id = c.customer_id';
    const usersWithCustomers = await pgB2Bpool.query(queryForUsersWithCustomer);

    const usersListWithRoles = await B2BUser.findAll({
      include: AppRole,
      order: [['user_id', 'ASC']],
    });
    const rolesListWithPermissions = await AppRole.findAll({
      include: AppPermission,
    });
    const permissionsList = await AppPermission.findAll();

    // Convert models to plain objects
    const plainUsersListWithRoles = usersListWithRoles.map((user) =>
      user.toJSON()
    );
    const plainRolesListWithPermissions = rolesListWithPermissions.map((role) =>
      role.toJSON()
    );
    const plainPermissionsList = permissionsList.map((permission) =>
      permission.toJSON()
    );

    for (const user of plainUsersListWithRoles) {
      //@ts-ignore
      for (const item of usersWithCustomers.rows) {
        if (user.user_id === item.user_id) {
          //@ts-ignore
          user['customer_name'] = item['customer_name'];
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      usersList: plainUsersListWithRoles,
      fullUsersListWithCustomers: usersWithCustomers.rows,
      rolesList: plainRolesListWithPermissions,
      permissionsList: plainPermissionsList,
    };
  } catch (error) {
    console.log('ERROR:', error);
    redirect('/signin?callbackUrl=/admin');
  }
};

const userSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  userName: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobilePhone: yup.string().required('Mobile phone is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .required('Password is required'),
});

export async function createUser(formState: any, formData: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    const customerId = formData.get('company');
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const userName = formData.get('username');
    const password = formData.get('password');
    const email = formData.get('email');
    const mobilePhone = formData.get('mobile_phone');

    const userData = {
      firstName,
      lastName,
      userName,
      password,
      email,
      mobilePhone,
    };

    // Validate input data with yup
    await userSchema.validate(userData, { abortEarly: false });

    // Check if the user already exists (optional step)
    const existingEmail = await B2BUser.findOne({ where: { email } });
    const existingUserName = await B2BUser.findOne({
      where: { username: userName },
    });
    const existingMobilePhone = await B2BUser.findOne({
      where: { mobile_phone: mobilePhone },
    });

    if (existingEmail) throw new Error('User with this email already exists.');
    if (existingUserName)
      throw new Error('User with this user name already exists.');
    if (existingMobilePhone)
      throw new Error('User with this mobile phone already exists.');

    // Get next user_id from sequence
    await setSchemaAndTimezone(pgB2Bpool);
    let user_id = null;
    try {
      const query = "select nextval('users_sq')";
      const res = await pgB2Bpool.query(query);

      user_id = res.rows[0].nextval;
      // return res.rows as Ticket[]; // Type assertion to ensure res.rows is of type Ticket[]
    } catch (error) {
      throw error;
    }

    //   // Create and save the new user
    const newUser = await B2BUser.create({
      user_id,
      customer_id: customerId,
      username: userName,
      password,
      password_change_date: new Date(),
      first_name: firstName,
      last_name: lastName,
      mobile_phone: mobilePhone,
      email,
      authentication_type: AuthenticationTypes.LOCAL,
      change_password: 'n',
      is_active: 'y',
      is_locked: 'n',
      last_login_attempt: new Date('1970-01-01T00:00:00Z'),
      last_login_status: 'i',
      record_version: 1,
      creation_date: new Date(),
      creation_user: 'admin',
      last_update_process: 'b2btickets',
    });

    logRequest.info(
      `A.F.: ${
        //@ts-ignore
        session?.user?.userName
      } - Creating New user with details: ${JSON.stringify({
        firstName,
        lastName,
        userName,
        email,
        mobilePhone,
      })}`
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Created!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function deleteUser({ userName }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
    ])) as Session;

    //  Delete User
    const deletedCount = await B2BUser.destroy({
      where: {
        username: userName,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    if (deletedCount === 0) {
      return { status: 'ERROR', message: 'User was not found!' };
    }

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Deleting user with username: ${userName}`
    );
    return { status: 'SUCCESS', message: 'User Deleted!' };
  } catch (error: unknown) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function lockorUnlockUser({ username }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Security_Management
    )) as Session;

    // Check if the user already exists
    const user = await B2BUser.findOne({ where: { username } });
    if (!user)
      throw new Error(`User with user name ${username} was not found!`);

    //@ts-ignore
    user.is_locked === 'y' ? (user.is_locked = 'n') : (user.is_locked = 'y');
    user.save();

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Locking user with username: ${username}`
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return {
      //@ts-ignore
      status: `${
        user.is_locked === 'y' ? 'SUCCESS_UNLOCKED' : 'SUCCESS_LOCKED'
      }`,
      // @ts-ignore
      message: `User ${username} is now ${
        user.is_locked === 'y' ? 'unlocked' : 'locked'
      }`,
    };
  } catch (error: any) {
    logRequest.error(error);
    return { status: 'ERROR', message: error.message };
  }
}

export async function activeorInactiveUser({ username }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Security_Management
    )) as Session;

    // Check if the user already exists
    const user = await B2BUser.findOne({ where: { username } });
    if (!user)
      throw new Error(`User with user name ${username} was not found!`);

    //@ts-ignore
    user.is_active === 'y' ? (user.is_active = 'n') : (user.is_active = 'y');
    user.save();

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Performing ${
        user.is_active === 'y' ? 'SUCCESS_UNLOCKED' : 'SUCCESS_LOCKED'
      } for user: ${username}`
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return {
      //@ts-ignore
      status: `${
        user.is_active === 'y' ? 'SUCCESS_UNLOCKED' : 'SUCCESS_LOCKED'
      }`,
      // @ts-ignore
      message: `User ${username} is now ${
        user.is_active === 'y' ? 'unlocked' : 'locked'
      }`,
    };
  } catch (error: any) {
    logRequest.error(error);
    return { status: 'ERROR', message: error.message };
  }
}

const userSchema_updateUser = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  userName: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobilePhone: yup.string().required('Mobile phone is required'),
});

function getRoleData(formData: any) {
  const roleData = [];
  const regex = /^role_(.*)$/;
  for (const [name, value] of formData.entries()) {
    const match = name.match(regex);
    if (match) {
      roleData.push(match[1]);
    }
  }
  return roleData;
}

export async function editUser(formState: any, formData: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
    ])) as Session;

    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const userName = formData.get('userName');
    const email = formData.get('email');
    const mobilePhone = formData.get('mobilePhone');

    const roleIDs = getRoleData(formData);

    const userData = {
      firstName,
      lastName,
      userName,
      email,
      mobilePhone,
    };

    // Validate input data with yup
    await userSchema_updateUser.validate(userData, { abortEarly: false });

    // Check if the user already exists
    const user = await B2BUser.findOne({ where: { username: userName } });

    if (!user)
      throw new Error(`User with user name ${userName} was not found!`);

    // @ts-ignore
    user.first_name = firstName;
    // @ts-ignore
    user.last_name = lastName;
    // @ts-ignore
    user.email = email;
    // @ts-ignore
    user.mobile_phone = mobilePhone;

    await user.save();

    // Empty All Roles of User
    //@ts-ignore
    await user.setAppRoles([]);

    for (let i = 0; i < roleIDs.length; i++) {
      const role = await AppRole.findByPk(roleIDs[i]);
      if (!role) throw new Error(`Role with id ${roleIDs[i]} was not found!`);

      //@ts-ignore
      await user.addAppRole(role);
    }
    //

    logRequest.info(
      `A.F.: ${
        //@ts-ignore
        session?.user.userName
      } - Performing User Edit for user: ${userName} ${JSON.stringify(
        userData,
        null,
        2
      )}`
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Updated!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

const roleSchema_updateRole = yup.object().shape({
  id: yup.number().required('Role id is required'),
  roleName: yup.string().required('Role name is required'),
  description: yup.string().required('Role description is required'),
});

function getPermissionData(formData: any) {
  const permissionData = [];
  const regex = /^permission_(.*)$/;
  for (const [name, value] of formData.entries()) {
    const match = name.match(regex);
    if (match) {
      permissionData.push(match[1]);
    }
  }
  return permissionData;
}

export async function editRole(formState: any, formData: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    const id = formData.get('roleId');
    const roleName = formData.get('roleName');
    const description = formData.get('description');

    const permissionIDs = getPermissionData(formData);

    const userData = {
      id,
      roleName,
      description,
    };

    // Validate input data with yup
    await roleSchema_updateRole.validate(userData, { abortEarly: false });

    // Check if the role already exists
    const role = await AppRole.findByPk(id);

    if (!role)
      throw new Error(`Role with role name ${roleName} was not found!`);

    // @ts-ignore
    role.roleName = roleName;
    // @ts-ignore
    role.description = description;

    await role.save();

    // Empty All Permissions of User
    //@ts-ignore
    await role.setAppPermissions([]);

    for (let i = 0; i < permissionIDs.length; i++) {
      const permission = await AppPermission.findByPk(permissionIDs[i]);
      if (!permission)
        throw new Error(
          `Permission with id ${permission && permission[i]} was not found!`
        );

      //@ts-ignore
      await role.addAppPermission(permission);
    }
    //

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Role Updated!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

const userSchema_updateUserPassword = yup.object().shape({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .required('Password is required'),
  verifyPassword: yup
    .string()
    .oneOf([yup.ref('password'), undefined], 'Passwords must match')
    .required('Verify Password is required'),
});

export async function updateUserPassword(formState: any, formData: any) {
  try {
    const session = await getServerSession(options);

    const userName = formData.get('username');
    const password = formData.get('password');
    const verifyPassword = formData.get('verifyPassword');

    // If the userName provided in this function is different from the logged in user name
    // then you have to belong to API_Security_Management Role to proceed with Password Reset
    if (session?.user.userName !== userName) {
      // Verify Security Permission
      await verifySecurityPermission(
        AppPermissionTypes.API_Security_Management
      );
    }

    const userData = {
      userName,
      password,
      verifyPassword,
    };
    // Validate input data with yup
    await userSchema_updateUserPassword.validate(userData, {
      abortEarly: false,
    });

    // Check if the user already exists
    const user = await B2BUser.findOne({ where: { username: userName } });

    if (!user)
      throw new Error(`User with user name ${userName} was not found!`);

    // Only admin can change the password of admin
    //@ts-ignore
    if (userName === 'admin' && session?.user.userName !== 'admin') {
      logRequest.info(
        //@ts-ignore
        `A.F.: ${session?.user.userName} - Tried to change the password of admin user and was denied`
      );

      throw new Error(`You cannot change the password of admin user`);
    }

    // @ts-ignore
    user.password = password;

    await user.save();

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Performing Password change for user: ${userName}`
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Password Updated!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function createPermission(formState: any, formData: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    const permissionName = formData.get('permissionName') as string;
    const endPoint = formData.get('endPoint');
    const permissionDescription = formData.get('permissionDescription');

    const existingRole = await AppPermission.findOne({
      where: { permissionName },
    });

    if (existingRole)
      return {
        status: 'ERROR',
        message: 'Role Already Exists',
      };

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Creating new App Permission named: ${permissionName}`
    );

    await AppPermission.create({
      permissionName,
      endPoint,
      description: permissionDescription,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Permission Created!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function createRole(formState: any, formData: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    const roleName = formData.get('roleName');
    const roleDescription = formData.get('roleDescription');

    const existingRole = await AppRole.findOne({ where: { roleName } });

    if (existingRole)
      return {
        status: 'ERROR',
        message: 'Role Already Exists',
      };

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session.user.userName} - Creating new App Role named: ${roleName}`
    );

    await AppRole.create({
      roleName,
      description: roleDescription,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Role Created!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function deleteRole({ role }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    //  Delete User
    const deletedCount = await AppRole.destroy({
      where: {
        roleName: role.roleName,
        description: role.description,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    if (deletedCount === 0) {
      return { status: 'ERROR', message: 'Role was not found!' };
    }

    //@ts-ignore
    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Deleting existing App Role named: ${role.roleName}`
    );

    return { status: 'SUCCESS', message: 'Role Deleted!' };
  } catch (error: unknown) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function updateAuthMethodForUser({ user, authType }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    //  Find User
    const foundUser = await AppUser.findOne({
      where: {
        userName: user.userName,
      },
    });

    //@ts-ignore
    foundUser.authenticationType = authType;
    //@ts-ignore
    await foundUser.save();

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return { status: 'SUCCESS', message: 'Auth type updated for User' };
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function deletePermission({ permission }: any) {
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission(
      AppPermissionTypes.API_Admin
    )) as Session;

    //  Delete Permission
    const deletedCount = await AppPermission.destroy({
      where: {
        permissionName: permission.permissionName,
        description: permission.description,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    if (deletedCount === 0) {
      return { status: 'ERROR', message: 'Permission was not found!' };
    }

    logRequest.info(
      //@ts-ignore
      `A.F.: ${session?.user.userName} - Deleting existing App Permission named: ${permission.permissionName}`
    );
    return { status: 'SUCCESS', message: 'Permission Deleted!' };
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}
