import React from 'react';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

const Denied = async () => {
  // Authentication check
  const session = await getServerSession(options);

  if (!session?.user) {
    redirect('/signin?callbackUrl=/');
  }

  return (
    <div className="flex flex-col justify-center items-center h-[500px]">
      <h1 className="text-black-500">Access Denied</h1>
      <p>You do not have permissions to access this page</p>
      <p className="pt-10">Please contact your system administrator</p>
      <Link href="/tickets" className="btn btn-primary mt-4">
        Go to Home Page
      </Link>
    </div>
  );
};

export default Denied;
