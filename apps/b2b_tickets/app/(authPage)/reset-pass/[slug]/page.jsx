import { getCsrfToken } from 'next-auth/react';
import Image from 'next/image';
import { background_nms_portal as imagePath } from '@b2b-tickets/assets';
import { PasswordResetForm } from './components/PasswordResetForm';
import { ReCaptchaProvider } from 'next-recaptcha-v3';

export default async function ResetPass({ params }) {
  const { slug } = params;
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
          <PasswordResetForm
            /*providers={providers}*/ csrfToken={csrfToken}
            jwtToken={slug}
          />
        </ReCaptchaProvider>
      </div>
    </>
  );
}
