import { DefaultUser } from 'next-auth';
import {
  AuthenticationTypes,
  ErrorCode,
  TransportName,
  AppPermissionType,
  AppRoleTypes,
} from '@b2b-tickets/shared-models';

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
