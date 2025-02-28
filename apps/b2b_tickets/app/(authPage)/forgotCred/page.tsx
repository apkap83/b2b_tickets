// app/auth/signin/page.jsx
import { getCsrfToken } from 'next-auth/react';
import ForgotPassForm from './components/ForgotPassForm';
import Image from 'next/image';
import { ReCaptchaProvider } from 'next-recaptcha-v3';

import { background_nms_portal as imagePath } from '@b2b-tickets/assets';

export default async function ForgotCred() {
  const csrfToken = await getCsrfToken();

  return (
    <>
      <div className="absolute inset-0 flex justify-center items-center">
        <ReCaptchaProvider
          reCaptchaKey={process.env['NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY']}
        >
          <Image
            src={imagePath}
            alt="Login Page Background Image"
            fill
            className="blur-sm"
            style={{ objectFit: 'cover' }}
          />
          <ForgotPassForm /*providers={providers}*/ csrfToken={csrfToken} />
        </ReCaptchaProvider>
      </div>
    </>
  );
}
