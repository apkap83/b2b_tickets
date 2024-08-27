import { ReactNode } from 'react';

export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}

      <div
        className={`text-white text-center text-2xl py-4 z-10 fixed w-full bottom-0 pb-10`}
      >
        Nova B2B Tickets - {new Date().getFullYear()}
      </div>
    </>
  );
}
