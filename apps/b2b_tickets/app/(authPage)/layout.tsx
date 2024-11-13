import React from 'react';
import { Footer } from '@b2b-tickets/ui';

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
