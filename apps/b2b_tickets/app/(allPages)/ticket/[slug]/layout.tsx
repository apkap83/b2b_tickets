import React, { ReactNode } from 'react';
import { NavBar } from '@b2b-tickets/ui';

export default function AllPagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
      <div
        className={`bg-gray-900 text-white text-center text-md py-3 z-10 fixed w-full bottom-0`}
      >
        Nova B2B Tickets - {new Date().getFullYear()}
      </div>
    </>
  );
}
