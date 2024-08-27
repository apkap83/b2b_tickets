'use server';

import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';

import * as yup from 'yup';
import { sequelize } from '@b2b-tickets/db-access';
import { revalidatePath } from 'next/cache';
import { fromErrorToFormState, toFormState } from '@b2b-tickets/utils';

import {
  AppRoleTypes,
  AppPermissionTypes,
  AuthenticationTypes,
} from '@b2b-tickets/shared-models';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { syncDatabase, syncDatabaseAlterTrue } from '@b2b-tickets/db-access';
import { userHasPermission } from '@b2b-tickets/auth-options';

const checkAuthenticationAndAdminRole = async () => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      throw new Error('Unauthenticated access: User is not authenticated');
    }

    const roles = session.user.roles;
    const permissions = session.user.permissions;

    let authorized = false;
    for (let i = 0; i < permissions.length; i++) {
      if (permissions[i].permissionName === AppPermissionTypes.API_Admin)
        authorized = true;
      if (
        permissions[i].permissionName ===
        AppPermissionTypes.API_Security_Management
      )
        authorized = true;
    }

    if (!authorized) {
      throw new Error(
        'Unauthorized access: User is not authorized for this action'
      );
    }
  } catch (error) {
    console.log('ERROR', error);
    redirect('/signin?callbackUrl=/admin');
  }
};

export const syncDBAlterTrueAction = async () => {
  const session = await getServerSession(options);
  if (!session) {
    throw new Error('Unauthenticated access: User is not authenticated');
  }
  if (!userHasPermission(session, 'Sync DB (Alter True)')) {
    throw new Error(
      'Unauthorized access: User is not authorized for this action (Sync DB (Alter True))'
    );
  }
  await syncDatabaseAlterTrue();
};

export const getAdminDashboardData = async () => {
  try {
    // await checkAuthenticationAndAdminRole();
    const { AppUser, AppRole, AppPermission } = sequelize.models;

    const usersListWithRoles = await AppUser.findAll({ include: AppRole });
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

    return {
      usersList: plainUsersListWithRoles,
      rolesList: plainRolesListWithPermissions,
      permissionsList: plainPermissionsList,
    };
  } catch (error) {
    console.log('ERROR:', error);
    redirect('/signin?callbackUrl=/admin');
  }
};

export const getNMSSystemData = async () => {
  try {
    await checkAuthenticationAndAdminRole();
    const { NMS_Systems, NMS_Systems_Additional_Pages } = sequelize.models;

    const nmsSystemsData = await NMS_Systems.findAll({
      include: {
        model: NMS_Systems_Additional_Pages,
      },
    });

    const plainNmsSystemData = nmsSystemsData.map((item) => item.toJSON());

    return plainNmsSystemData;
  } catch (error) {
    console.log('ERROR', error);
    redirect('/signin?callbackUrl=/NMS_Team/Systems');
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

const { AppUser, AppRole, AppPermission } = sequelize.models;

export async function createUser(formState: any, formData: any) {
  try {
    await checkAuthenticationAndAdminRole();
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const userName = formData.get('userName');
    const password = formData.get('password');
    const email = formData.get('email');
    const mobilePhone = formData.get('mobilePhone');

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
    const existingEmail = await AppUser.findOne({ where: { email } });
    const existingUserName = await AppUser.findOne({ where: { userName } });
    const existingMobilePhone = await AppUser.findOne({
      where: { mobilePhone },
    });

    if (existingEmail) throw new Error('User with this email already exists.');
    if (existingUserName)
      throw new Error('User with this user name already exists.');
    if (existingMobilePhone)
      throw new Error('User with this mobile phone already exists.');

    //   // Create and save the new user
    const newUser = await AppUser.create({
      firstName,
      lastName,
      userName,
      password,
      email,
      mobilePhone,
      authenticationType: AuthenticationTypes.LOCAL,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Created!');
  } catch (error) {
    return fromErrorToFormState(error);
  }
}

// interface userObj {
//   firstName: string;
//   lastName: string;
//   userName: string;
//   password: string;
//   email: string;
//   mobilePhone: string;
// }

export async function createUserIfNotExistsAfterLDAPSuccessfullAuth(user: any) {
  try {
    // await checkAuthenticationAndAdminRole();

    const { firstName, lastName, userName, password, email, mobilePhone } =
      user;

    // Validate input data with yup
    // await userSchema.validate(userData, { abortEarly: false });

    // Check if the user already exists (optional step)
    const existingUserName = await AppUser.findOne({ where: { userName } });

    if (existingUserName) return;

    //   // Create and save the new user
    const newUser = await AppUser.create({
      firstName,
      lastName,
      userName,
      password,
      email,
      mobilePhone,
      authenticationType: AuthenticationTypes.LDAP,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return { status: 'SUCCESS', message: 'User Created!' };
  } catch (error) {
    return { status: 'ERROR', message: 'Error using useCreated!' };
  }
}

export async function deleteUser({ userName }: any) {
  try {
    await checkAuthenticationAndAdminRole();
    //  Delete User
    const deletedCount = await AppUser.destroy({
      where: {
        userName,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    if (deletedCount === 0) {
      return { status: 'ERROR', message: 'User was not found!' };
    }

    return { status: 'SUCCESS', message: 'User Deleted!' };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

export async function lockorUnlockUser({ userName }: any) {
  try {
    await checkAuthenticationAndAdminRole();
    // Check if the user already exists
    const user = await AppUser.findOne({ where: { userName } });
    if (!user)
      throw new Error(`User with user name ${userName} was not found!`);

    //@ts-ignore
    user.active = !user.active;
    user.save();

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return {
      //@ts-ignore
      status: `${user.active ? 'SUCCESS_UNLOCKED' : 'SUCCESS_LOCKED'}`,
      // @ts-ignore
      message: `User ${userName} is now ${user.active ? 'unlocked' : 'locked'}`,
    };
  } catch (error) {
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
    await checkAuthenticationAndAdminRole();

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
    const user = await AppUser.findOne({ where: { userName } });

    if (!user)
      throw new Error(`User with user name ${userName} was not found!`);

    // @ts-ignore
    user.firstName = firstName;
    // @ts-ignore
    user.lastName = lastName;
    // @ts-ignore
    user.email = email;
    // @ts-ignore
    user.mobilePhone = mobilePhone;

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

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Updated!');
  } catch (error) {
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
    await checkAuthenticationAndAdminRole();

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
        throw new Error(`Permission with id ${permission[i]} was not found!`);

      //@ts-ignore
      await role.addAppPermission(permission);
    }
    //

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Role Updated!');
  } catch (error) {
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
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Verify Password is required'),
});

export async function updateUserPassword(formState: any, formData: any) {
  try {
    await checkAuthenticationAndAdminRole();

    const userName = formData.get('userName');
    const password = formData.get('password');
    const verifyPassword = formData.get('verifyPassword');

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
    const user = await AppUser.findOne({ where: { userName } });

    if (!user)
      throw new Error(`User with user name ${userName} was not found!`);

    // @ts-ignore
    user.password = password;

    await user.save();

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Updated!');
  } catch (error) {
    return fromErrorToFormState(error);
  }
}

export async function createPermission(formState: any, formData: any) {
  try {
    await checkAuthenticationAndAdminRole();
    const permissionName = formData.get('permissionName');
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

    const newRole = await AppPermission.create({
      permissionName,
      endPoint,
      description: permissionDescription,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Permission Created!');
  } catch (error) {
    return fromErrorToFormState(error);
  }
}

export async function createRole(formState: any, formData: any) {
  try {
    await checkAuthenticationAndAdminRole();
    const roleName = formData.get('roleName');
    const roleDescription = formData.get('roleDescription');

    const existingRole = await AppRole.findOne({ where: { roleName } });

    if (existingRole)
      return {
        status: 'ERROR',
        message: 'Role Already Exists',
      };

    const newRole = await AppRole.create({
      roleName,
      description: roleDescription,
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Role Created!');
  } catch (error) {
    return fromErrorToFormState(error);
  }
}

export async function deleteRole({ role }: any) {
  try {
    await checkAuthenticationAndAdminRole();
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

    return { status: 'SUCCESS', message: 'Role Deleted!' };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

export async function updateAuthMethodForUser({ user, authType }: any) {
  try {
    await checkAuthenticationAndAdminRole();
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
    return { status: 'ERROR', message: error.message };
  }
}

export async function deletePermission({ permission }: any) {
  try {
    await checkAuthenticationAndAdminRole();
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

    return { status: 'SUCCESS', message: 'Permission Deleted!' };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

// export async function readNMStandByFile() {
//   const filePath = path.join(
//     process.cwd(),
//     'app',
//     '(db)',
//     'seeders',
//     'standby_files',
//     'Stand by NMS.txt'
//   );

//   try {
//     const contents = await fs.promises.readFile(filePath, 'utf8');

//     return contents;
//   } catch (err) {
//     console.error('Error reading file:', err);
//     throw err;
//   }
// }

export async function getStandByHistory() {
  try {
    const { StandBy, NMS_Standby_Order } = sequelize.models;

    const standByEntries = await StandBy.findAll({
      order: [['date', 'ASC']], // This will order the results by the 'date' column in ascending order
    });

    const nmsStandByOrder = await NMS_Standby_Order.findAll();
    // Convert models to plain objects
    const plainNmsStandByOrderList = nmsStandByOrder
      .map((user) => user.toJSON())
      .map((item) => [item.id, item.standByPerson]);

    // Create an object to store the results
    const standByEntriesByDate = {};

    // Populate the object with date as key and standByPerson as value
    standByEntries.forEach((entry) => {
      const formattedDate = dayjs(entry.date).format('YYYY-MM-DD');
      standByEntriesByDate[formattedDate] = entry.standByPerson;
    });

    // Ensure both results are arrays
    if (
      !Array.isArray(plainNmsStandByOrderList) ||
      typeof standByEntriesByDate !== 'object'
    ) {
      throw new Error('Invalid return values from getStandByHistory');
    }

    return [plainNmsStandByOrderList, standByEntriesByDate];
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}
