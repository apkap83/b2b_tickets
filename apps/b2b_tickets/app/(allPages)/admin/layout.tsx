import React from 'react';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { NavBar } from '@b2b-tickets/ui';
import { Footer } from '@b2b-tickets/ui';

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(options);
  return (
    <>
      {session ? <NavBar /> : null}
      {children}
      {session ? <Footer /> : null}
    </>
  );
}
