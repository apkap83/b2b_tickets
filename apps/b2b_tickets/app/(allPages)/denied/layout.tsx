import React, { ReactNode } from 'react';
import { NavBar } from '@b2b-tickets/ui';

export default function AllPagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
