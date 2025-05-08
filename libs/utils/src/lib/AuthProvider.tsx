'use client';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export default AuthProvider;
