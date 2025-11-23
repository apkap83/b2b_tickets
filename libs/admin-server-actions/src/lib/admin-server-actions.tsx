'use server';

import { options } from '@b2b-tickets/auth-options';
import { Session } from '@b2b-tickets/shared-models';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import * as yup from 'yup';
import {
  sequelize,
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
  generateResetToken,
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
import { getRequestLogger } from '@b2b-tickets/server-actions/server';
import { CustomLogger } from '@b2b-tickets/logging';
import { TransportName } from '@b2b-tickets/shared-models';
import { sendEmailsForUserCreation } from '@b2b-tickets/email-service/server';
import { EmailNotificationType } from '@b2b-tickets/shared-models';
import { PresenceService } from '@b2b-tickets/redis-service';
//@ts-ignore
import { v7 as uuidv7 } from 'uuid';

const verifySecurityPermission = async (
  permissionName: AppPermissionTypes | AppPermissionTypes[]
) => {
  try {
    const session = await getServerSession(options);

    if (!session || !session?.user) {
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

    if (!userHasRole(session, roleName)) {
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    // Verify Security Permission
    await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ]);

    await setSchemaAndTimezone(pgB2Bpool);

    const getList =
      'SELECT customer_id, customer_display_name from customers_v';
    const customersList = await pgB2Bpool.query(getList);

    return customersList.rows;
  } catch (error) {
    logRequest.error(error);
  }
};

export const getAdminDashboardData = async () => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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
    const plainUsersListWithRoles = usersListWithRoles.map((user: any) =>
      user.toJSON()
    );
    const plainRolesListWithPermissions = rolesListWithPermissions.map(
      (role: any) => role.toJSON()
    );
    const plainPermissionsList = permissionsList.map((permission: any) =>
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

    // Add online status for each user
    try {
      const onlineUsers = await PresenceService.getOnlineUsers();
      const onlineUserIds = new Set(
        onlineUsers.map((u) => u.userId.toString())
      );

      for (const user of plainUsersListWithRoles) {
        const userId = user.user_id.toString();
        //@ts-ignore
        user['isOnline'] = onlineUserIds.has(userId);

        // Add last seen info if available
        const onlineUser = onlineUsers.find(
          (u) => u.userId.toString() === user.user_id.toString()
        );
        if (onlineUser) {
          //@ts-ignore
          user['lastSeen'] = onlineUser.lastSeen;
          //@ts-ignore
          user['connectedAt'] = onlineUser.connectedAt;
        }
      }
    } catch (error) {
      // Set all users as offline if Redis fails
      for (const user of plainUsersListWithRoles) {
        //@ts-ignore
        user['isOnline'] = false;
      }
    }

    return {
      userStats: {
        totalUsers: plainUsersListWithRoles.length,
        totalOnlineUsers: plainUsersListWithRoles.filter((u: any) => u.isOnline)
          .length,
      },
      usersList: plainUsersListWithRoles,
      fullUsersListWithCustomers: usersWithCustomers.rows,
      rolesList: plainRolesListWithPermissions,
      permissionsList: plainPermissionsList,
    };
  } catch (error) {
    logRequest.error(error);
    redirect('/signin?callbackUrl=/admin');
  }
};

export const getAllCompanyData = async () => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    // Verify Security Permission
    (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForCompanyDta = `
        SELECT
          CUSTOMER_ID,
          CUSTOMER_NAME "Customer",
          CUSTOMER_CODE "Customer Code",
          CUSTOMER_TYPE_ID,
          CUSTOMER_TYPE "Customer Type",
          FISCAL_NUMBER "Fiscal Number"
        FROM CUSTOMERS_V
        WHERE CUSTOMER_ID != -1
        AND   CUSTOMER_TYPE_ID != -1
        ORDER BY 
          CUSTOMER_NAME;
      `;

    const resp = await pgB2Bpool.query(queryForCompanyDta);

    return {
      companyData: resp.rows,
    };
  } catch (error) {
    logRequest.error(error);
    redirect('/signin?callbackUrl=/admin');
  }
};

// Server action to add a ticket category to a customer
export const addCustomerTicketCategory = async ({
  customerId,
  categoryId,
}: {
  customerId: number;
  categoryId: number;
}) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForAddCategory = `
        SELECT custtckcat_insert(
          pnum_Customer_ID => $1,
          pnum_Category_ID => $2,
          pnum_User_ID => $3,
          pvch_API_User => $4,
          pvch_API_Process => $5,
          pbln_Debug_Mode => $6
        ) as result;
      `;

    const resp = await pgB2Bpool.query(queryForAddCategory, [
      customerId,
      categoryId,
      session.user?.user_id,
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    logRequest.info(`Added category ${categoryId} to customer ${customerId}`);

    return {
      success: true,
      result: resp.rows[0]?.result,
      message: 'Category added successfully',
    };
  } catch (error: any) {
    logRequest.error(error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to add category',
    };
  }
};

// Server action to deactivate a customer ticket category
export const deactivateCustomerTicketCategory = async ({
  customerTicketCategoryId,
}: {
  customerTicketCategoryId: number;
}) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForDeactivateCategory = `
        CALL custtckcat_deact(
          pnum_Customer_Ticket_Category_ID => $1,
          pnum_User_ID => $2,
          pvch_API_User => $3,
          pvch_API_Process => $4,
          pbln_Debug_Mode => $5
        );
      `;

    await pgB2Bpool.query(queryForDeactivateCategory, [
      customerTicketCategoryId,
      session.user?.user_id,
      config.api.user,
      config.api.process,
      config.postgres_b2b_database.debugMode,
    ]);

    logRequest.info(
      `Deactivated customer ticket category ${customerTicketCategoryId}`
    );

    return {
      success: true,
      message: 'Category deactivated successfully',
    };
  } catch (error: any) {
    logRequest.error(error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to deactivate category',
    };
  }
};

export const getCompanyCategories = async ({
  customerId,
}: {
  customerId: string;
}) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    // Verify Security Permission
    (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    await setSchemaAndTimezone(pgB2Bpool);

    const queryForCompanyDta = `
        SELECT
          customer_ticket_category_id,
          CUSTOMER_ID,
          CATEGORY_ID,
          CATEGORY_NAME "Category",
          IS_ADDED "Assigned",
          is_available_for_tickets 
        FROM CUSTOMER_TICKET_CATEGORIES_V CTC
        WHERE CTC.CUSTOMER_ID = $1;
      `;

    const resp = await pgB2Bpool.query(queryForCompanyDta, [customerId]);

    return {
      companyData: resp.rows,
    };
  } catch (error) {
    logRequest.error(error);
    redirect('/signin?callbackUrl=/admin');
  }
};

// Helper function to verify privileged role creation permissions
async function verifyPrivilegedRoleCreation(roleId: string) {
  // Fetch the role to check its type
  const targetRole = await AppRole.findByPk(roleId);

  if (!targetRole) {
    throw new Error(`Role with id ${roleId} was not found!`);
  }

  // Define privileged roles that require special permission
  const privilegedRoles = [AppRoleTypes.Admin, AppRoleTypes.Security_Admin];

  // Check if the target role is privileged
  const isPrivilegedRole = privilegedRoles.includes(targetRole.roleName);

  if (isPrivilegedRole) {
    // Try to verify if user has API_Security_Management permission OR Admin role
    let hasRequiredAccess = false;

    try {
      // Check for API_Security_Management permission
      await verifySecurityPermission(
        AppPermissionTypes.API_Security_Management
      );
      hasRequiredAccess = true;
    } catch (permissionError) {
      // If permission check fails, try role check
      try {
        await verifySecurityRole(AppRoleTypes.Admin);
        hasRequiredAccess = true;
      } catch (roleError) {
        // Both checks failed
        hasRequiredAccess = false;
      }
    }

    if (!hasRequiredAccess) {
      throw new Error(
        'Insufficient permissions: Only users with API Security Management permission or Admin role can create users with Admin or Security Admin privileges.'
      );
    }
  }
}

const userSchema = yup.object().shape({
  company: yup.string().required('Company is required'),
  role: yup.string().required('Role is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  userName: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobilePhone: yup.string(),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .required('Password is required'),
});

export async function createUser(formState: any, formData: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  // Start a transaction from your connection and save it into a variable
  const t = await sequelize.transaction();

  try {
    // Verify Security Permission
    const session = (await verifySecurityPermission([
      AppPermissionTypes.API_Security_Management,
      AppPermissionTypes.Create_New_App_User,
    ])) as Session;

    const customerId = formData.get('company');
    const roleId = formData.get('role');
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    // const userName = formData.get('username');
    // const password = formData.get('password');
    const email = formData.get('email').toLowerCase();
    const mobilePhone = formData.get('mobile_phone');
    const inform_user_for_new_account_by_email = formData.get(
      'inform_user_for_new_account_by_email'
    );
    const addUserAnywayToRepresentMultipleCompanies = formData.get(
      'addUserAnywayToRepresentMultipleCompanies'
    );

    // Username === email
    let userName = email;

    // Generate a Random Password and add Some More Complexity
    // This password will never be used from the User since it is unknown even to admin
    // Exists only for filling the field in DB
    const password = generateResetToken() + 'ak!!';

    const userData = {
      company: customerId,
      role: roleId,
      firstName,
      lastName,
      userName,
      password,
      email,
      mobilePhone,
    };

    // Validate input data with yup
    await userSchema.validate(userData, { abortEarly: false });

    // Check if user is trying to create privileged role and verify permissions
    await verifyPrivilegedRoleCreation(userData.role);

    // Check if the user already exists (optional step)
    const existingEmail = await B2BUser.findOne({ where: { email } });

    // Information message for multiple companies representation
    if (existingEmail && !addUserAnywayToRepresentMultipleCompanies) {
      return toFormState('INFO', 'User with this email already exists.');
    }
    // Proceed anyway
    if (existingEmail && addUserAnywayToRepresentMultipleCompanies) {
      // User Name will be a random UUID
      userName = uuidv7().toString();
    }

    const existingUserName = await B2BUser.findOne({
      where: { username: userName },
    });

    if (existingUserName)
      throw new Error('User with this user name already exists.');

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

    // Create and save the new user
    const newUser = await B2BUser.create(
      {
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
        creation_user: session.user?.userName || 'system',
        last_update_user: session.user?.userName || 'system',
        last_update_process: 'b2btickets',
        mfa_method: 'e',
      },
      { transaction: t }
    );

    // Assigning Role to User

    // Empty All Roles of User
    //@ts-ignore
    await newUser.setAppRoles([], { transaction: t });

    const foundRoleInDB = await AppRole.findByPk(roleId, { transaction: t });

    if (!foundRoleInDB)
      throw new Error(`Role with id ${roleId} was not found!`);

    //@ts-ignore
    await newUser.addAppRole(foundRoleInDB, { transaction: t });

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

    // If the execution reaches this line, no errors were thrown.
    // Commit the transaction.
    await t.commit();

    // Inform user for New account Only by email
    if (
      inform_user_for_new_account_by_email &&
      !addUserAnywayToRepresentMultipleCompanies
    )
      sendEmailsForUserCreation({
        emailNotificationType: EmailNotificationType.USER_CREATION,
        email,
        userName,
      });

    revalidatePath('/admin');

    return toFormState('SUCCESS', 'User Created!');
  } catch (error) {
    await t.rollback();
    logRequest.error(error);
    return fromErrorToFormState(error);
  } finally {
  }
}

export async function deleteUser({ userName }: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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

export async function updateMFAMethodForUser({ username, mfaType }: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    // Verify Security Permission
    const session = await verifySecurityPermission(
      AppPermissionTypes.API_Security_Management
    );

    // Check if the user already exists
    const user = await B2BUser.findOne({ where: { username } });
    if (!user)
      throw new Error(`User with user name ${username} was not found!`);

    user.mfa_method = mfaType;
    user.save();

    logRequest.info(
      `A.F.: ${session?.user.userName} - Altering MFA Method for User: ${username} to MFA: ${mfaType}`
    );

    revalidatePath('/admin');

    return {
      status: `SUCCESS`,
      message: `User ${username} has now altered MFA Method`,
    };
  } catch (error: any) {
    logRequest.error(error);
    return { status: 'ERROR', message: error.message };
  }
}

export async function activeorInactiveUser({ username }: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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
  mobilePhone: yup.string(),
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
  try {
    const session = await getServerSession(options);

    // ✅ Ensure user is authenticated
    if (!session?.user) {
      throw new Error('Unauthorized: No active session');
    }

    const userName = formData.get('username');
    const password = formData.get('password');
    const email = formData.get('email');
    const verifyPassword = formData.get('verifyPassword');

    // If the userName provided in this function is different from the logged in user name
    // then you have to belong to API_Security_Management Role to proceed with Password Reset
    if (session?.user.userName !== userName) {
      // Verify Security Permission
      await verifySecurityPermission(
        AppPermissionTypes.API_Security_Management
      );

      logRequest.warn(
        `A.F.: SECURITY ALERT:  ${session.user.userName} - Attempting to change password for different user: ${userName}`
      );
    }

    const userData = {
      userName,
      email,
      password,
      verifyPassword,
    };

    // Validate input data with yup
    await userSchema_updateUserPassword.validate(userData, {
      abortEarly: false,
    });

    // Find users by email OR username (for users without email like admin)
    let users: (typeof B2BUser)[] = [];

    if (email && email.trim() !== '') {
      // Find by email if provided
      users = await B2BUser.findAll({
        where: { email: email.toLowerCase() },
      });
    }

    // If no users found by email, or email is empty, try username
    if (users.length === 0 && userName) {
      users = await B2BUser.findAll({
        where: { username: userName },
      });
    }

    if (!users || users.length === 0) {
      throw new Error(
        `No users found with ${
          email ? `email ${email}` : `username ${userName}`
        }`
      );
    }

    // Check if trying to change admin password
    const hasAdminUser = users.some(
      (user: typeof B2BUser) => user.username === 'admin'
    );

    if (hasAdminUser && session?.user.userName !== 'admin') {
      logRequest.info(
        `A.F.: ${session?.user.userName} - Tried to change the password of admin user and was denied`
      );
      throw new Error(`You cannot change the password of admin user`);
    }

    // ✅ Additional check: Verify user is active and not locked
    const inactiveOrLockedUsers = users.filter(
      (user: typeof B2BUser) => user.is_active !== 'y' || user.is_locked === 'y'
    );

    if (inactiveOrLockedUsers.length > 0) {
      throw new Error('Cannot change password for inactive or locked users');
    }

    // Loop over all users and update their passwords
    for (const user of users) {
      user.password = password;
      user.password_change_date = new Date();
      await user.save();

      logRequest.info(
        `A.F.: ${session?.user.userName} - Password changed for user: ${user.userName} (${email})`
      );
    }

    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Password Updated!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function createPermission(formState: any, formData: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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

    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Permission Created!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function createRole(formState: any, formData: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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

    revalidatePath('/admin');

    return toFormState('SUCCESS', 'Role Created!');
  } catch (error) {
    logRequest.error(error);
    return fromErrorToFormState(error);
  }
}

export async function deleteRole({ role }: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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

export async function deletePermission({ permission }: any) {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );
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

export const getCurrentUserCompanies = async (emailAddress: string) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await getServerSession(options);

    if (!session || !session?.user) {
      throw new Error('Unauthenticated or missing user information');
    }

    // Ticket Creators can only access their own companies (not belonging to Support Company)
    if (
      session.user.customer_id !== -1 &&
      (await verifySecurityRole(AppRoleTypes.B2B_TicketCreator))
    ) {
      if (session.user.email !== emailAddress) {
        throw new Error('Ticket Creators can only access their own companies');
      }
    }

    await setSchemaAndTimezone(pgB2Bpool);

    // Get all companies for the current user's email
    const queryForUserCompanies = `
      SELECT DISTINCT
        c.customer_id,
        c.customer_name,
        c.customer_code
      FROM users u
      INNER JOIN customers c ON u.customer_id = c.customer_id
      WHERE u.email = $1
        AND u.is_active = 'y'
        AND u.is_locked = 'n'
      ORDER BY c.customer_name;
    `;

    const result = await pgB2Bpool.query(queryForUserCompanies, [emailAddress]);
    logRequest.debug(
      `Retrieved ${result.rows.length} companies for user: ${session.user.userName}`
    );

    return result.rows;
  } catch (error) {
    logRequest.error(error);
    return [];
  }
};

// Pre-validation before the client calls update()
// Better user experience (can show error messages before attempting update)
// Audit logging of switch attempts
export const switchUserCompany = async (newCustomerId: number) => {
  const logRequest: CustomLogger = await getRequestLogger(
    TransportName.ACTIONS
  );

  try {
    const session = await getServerSession(options);

    if (session) {
      logRequest.info(
        `Session user: ${JSON.stringify({
          userName: session.user?.userName,
          email: session.user?.email,
          customer_id: session.user?.customer_id,
          customer_name: session.user?.customer_name,
        })}`
      );
    }

    if (!session || !session?.user) {
      throw new Error('Unauthenticated or missing user information');
    }

    await setSchemaAndTimezone(pgB2Bpool);

    // Verify that the user has access to this company
    const queryForUserCompanies = `
      SELECT DISTINCT c.customer_id, c.customer_name
      FROM users u
      INNER JOIN customers c ON u.customer_id = c.customer_id
      WHERE u.email = $1
        AND c.customer_id = $2
        AND u.is_active = 'y'
        AND u.is_locked = 'n'
    `;

    const result = await pgB2Bpool.query(queryForUserCompanies, [
      session.user.email,
      newCustomerId,
    ]);

    if (result.rows.length === 0) {
      logRequest.error(
        `User '${session.user.userName}' attempted to access unauthorized company ${newCustomerId}`
      );
      throw new Error('User does not have access to this company');
    }

    const customer_name = result.rows[0].customer_name;

    const returnValue = {
      success: true,
      customer_id: newCustomerId,
      customer_name: customer_name,
      shouldUpdateSession: true,
    };

    return returnValue;
  } catch (error) {
    logRequest.error(error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
