import NextAuth from 'next-auth';

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
