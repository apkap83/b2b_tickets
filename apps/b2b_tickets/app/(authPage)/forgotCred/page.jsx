// app/auth/signin/page.jsx
import { getProviders, getCsrfToken } from 'next-auth/react';
import ForgotPassForm from './components/ForgotPassForm';
import Image from 'next/image';

import { background_nms_portal as imagePath } from '@b2b-tickets/assets';
import { Footer } from '@b2b-tickets/ui';

export default async function SignIn() {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken();

  return (
    <>
      <div className="absolute inset-0 flex justify-center items-center">
        <Image
          src={imagePath}
          alt="Login Page Background Image"
          fill
          className="blur-sm"
          style={{ objectFit: 'cover' }}
        />
        <ForgotPassForm providers={providers} csrfToken={csrfToken} />
        <Footer />
      </div>
    </>
  );
}
