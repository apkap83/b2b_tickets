// app/auth/signin/page.jsx
import { getProviders, getCsrfToken } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import SignInForm from './components/SigninForm';
import Image from 'next/image';

import { background_nms_portal as imagePath } from '@b2b-tickets/assets';
import { Footer } from '@b2b-tickets/ui';
import { ReCaptchaProvider } from 'next-recaptcha-v3';

export default async function SignIn({ searchParams }) {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken();

  // Check if user is already authenticated
  const session = await getServerSession(authOptions);

  // Get the callback URL from search parameters
  const callbackUrl = searchParams?.callbackUrl || '/tickets';

  // If authenticated, redirect to the callback URL or tickets
  if (session) {
    redirect(callbackUrl);
  }

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
          <SignInForm providers={providers} csrfToken={csrfToken} />
          <Footer />
        </ReCaptchaProvider>
      </div>
    </>
  );
}
