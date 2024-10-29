'use client';

import { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFormik, FormikTouched, FormikErrors } from 'formik';
import * as Yup from 'yup';

import { FaKey } from 'react-icons/fa';
import clsx from 'clsx';
import { config } from '@b2b-tickets/config';
import { TwoFactAuth } from './TwoFactAuth';
import { ErrorCode } from '@b2b-tickets/shared-models';
import { useCountdown } from '@b2b-tickets/react-hooks';
import { formatTimeMMSS } from '@b2b-tickets/utils';
import { NovaLogo } from '@b2b-tickets/assets';
import { MdOutlineMailLock } from 'react-icons/md';

interface FieldErrorProps {
  formik: {
    touched: FormikTouched<any>;
    errors: FormikErrors<any>;
  };
  name: string;
}

const FieldError: React.FC<FieldErrorProps> = ({ formik, name }) => {
  // Only return if touched and there is a string error for the field.
  const error = formik.errors[name];

  if (!formik?.touched[name] || typeof error !== 'string') {
    return null;
  }

  return <p className="text-red-500 text-sm">{error}</p>;
};

export default function ForgotPassForm({ csrfToken }: { csrfToken: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false); // State to track if ReCAPTCHA is completed
  const [totpVerified, setTotpVerified] = useState(false);

  const [totpCode, setTotpCode] = useState('');

  const [showOTP, setShowOTP] = useState(false);
  const [showEmailTokenField, setShowEmailTokenField] = useState(false);

  const [emailFieldIsReadOnly, setEmailFieldIsReadOnly] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [callbackUrl, setCallbackUrl] = useState('/');

  const [submitButtonLabel, setSubmitButtonLabel] = useState('Submit');

  // Create references to User Name & Password fields
  const emailRef = useRef<HTMLInputElement | null>(null);
  const userNameLabelRef = useRef(null);
  const userNamePasswordGroupRef = useRef<HTMLDivElement | null>(null);

  // Assuming the type of the reCAPTCHA component has a 'reset' method.
  type RecaptchaRefType = {
    reset: () => void;
  };

  // Create a reference for reCAPTCHA
  const recaptchaRef = useRef<any>(); // New useRef for reCAPTCHA
  // Handle the onChange event of the ReCAPTCHA
  const handleCaptchaChange = (value: string | null) => {
    setCaptcha(value);
    // Set as verified when captcha value is present
  };

  const { timeLeft, isRunning, start, resetTimer } = useCountdown(0, () => {
    // When the Token Remainng Time reaches 0, perform full web page refresh
    window.location.reload();
    // router.reload();
  });

  // Remove 2 Cookies on Page load
  useEffect(() => {
    // Remove cookies on page load
    Cookies.remove('captchaJWTToken');
    Cookies.remove('totpJWTToken');
  }, []);

  useEffect(() => {
    // If user is already authenticated, redirect to the homepage
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }

    // Extract callbackUrl from the current URL
    const query = new URLSearchParams(window.location.search);
    const cbUrl = query.get('callbackUrl');
    if (cbUrl) {
      setCallbackUrl(cbUrl);
    }
  }, [status, router, callbackUrl]);

  const getReCaptchaJWTToken = async ({ setSubmitting }: any) => {
    if (!captcha) {
      setError('Verify reCAPTCHA!');
      setSubmitting(false);
      return;
    }

    try {
      // Call your custom captcha validation API route
      const captchaResponse = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ captchaToken: captcha }),
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResponse.ok) {
        setError(captchaResult.message || 'Invalid reCAPTCHA');
        setSubmitting(false);

        // Reset the reCAPTCHA (if active)
        if (config.CaptchaIsActiveForPasswordReset && recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        return;
      }

      // Server Verified Captcha at this point
      setCaptchaVerified(true);
    } catch (error) {
      setError(
        'An error occurred while validating reCAPTCHA. Please try again.'
      );
      setSubmitting(false);

      // Reset the reCAPTCHA (if active)
      if (config.CaptchaIsActiveForPasswordReset && recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      return;
    }
  };

  const getTotpJWTToken = async ({ setSubmitting }: any) => {
    if (!totpCode) {
      setError('Verify TOTP Code!');
      setSubmitting(false);
      return;
    }
    try {
      // Call your custom captcha validation API route
      const totpResponse = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formik.values.email, totpCode }),
      });

      const totpResult = await totpResponse.json();

      if (!totpResponse.ok) {
        setError(totpResult.message || 'Invalid TOTP Code');
        setSubmitting(false);
        return;
      }

      // Server Verified Totp at this point
      setTotpVerified(true);
    } catch (error) {
      setError('An error occurred while validating TOTP. Please try again.');
      setSubmitting(false);
      return;
    }
  };

  const validationSchema = Yup.object({
    email: Yup.string().required('Email is required'),
    emailToken: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      tokenForEmail: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true); // Disable the submit button
      setError(null);

      if (config.CaptchaIsActiveForPasswordReset) {
        if (!captcha) {
          setError('Verify reCAPTCHA!');
          return;
        }

        if (!captchaVerified) {
          await getReCaptchaJWTToken({ setSubmitting });
        }
      }

      if (config.TwoFactorEnabledForPasswordReset && totpCode) {
        await getTotpJWTToken({ setSubmitting });
      }

      const response = await signIn('credentials-password-reset', {
        redirect: false,
        email: values.email,
        captchaToken: captcha,
        totpCode,
        tokenForEmail: formik.values.tokenForEmail,
      });

      if (!response) return;

      if (response.ok) {
        window.location.href = callbackUrl;
      }

      let error = response?.error?.replace('Error: ', '');

      // If no error field exists or it's empty, return early
      if (!error) return;

      switch (error) {
        case ErrorCode.EmailIsRequired:
          setError('Email is Required');
          setSubmitting(false);
          break;
        case ErrorCode.IncorrectEmailProvided:
          setError('Email is incorrect');
          setSubmitting(false);
          if (config.CaptchaIsActiveForPasswordReset) {
            setCaptchaVerified(false);
            if (recaptchaRef.current) {
              recaptchaRef.current.reset();
            }
          }
          break;
        case ErrorCode.TotpJWTTokenRequired:
          setShowOTP(true);
          setSubmitting(false);
          setEmailFieldIsReadOnly(true);
          break;
        case ErrorCode.CaptchaValidationFailed:
          setError('Invalid reCAPTCHA validation');
          setSubmitting(false);

          // Reset the reCAPTCHA (if active)
          if (config.CaptchaIsActiveForPasswordReset) {
            setCaptchaVerified(false);
            if (recaptchaRef.current) {
              recaptchaRef.current.reset();
            }
          }
          break;
        case ErrorCode.CaptchaJWTTokenRequired:
          window.location.reload();
          break;
        case ErrorCode.TokenForEmailRequired:
          setSubmitting(false);
          setCaptchaVerified(true);
          setEmailFieldIsReadOnly(true);
          setShowEmailTokenField(true);

          break;
        case ErrorCode.IncorrectPassResetTokenProvided:
          setSubmitting(false);
          setEmailFieldIsReadOnly(true);
          setError('Incorrect Token provided');
          break;
        default:
          setError('Internal Server Error');
          setSubmitting(false);
          break;
      }
    },
  });

  return (
    <div
      className={`w-[500px] relative shadow-md rounded-2xl flex flex-col justify-center 
      items-center p-7  backdrop-blur-lg bg-gray-100 border border-[#26295375]

      `}
      style={{
        transform: 'translateY(-20%)',
      }}
    >
      <div className={`w-[300px] mb-2`}>
        <div
          /*  text-[#262953] */
          className={`text-2xl tracking-widest text-[black] font-bold
                        border-[#7b7b7c] pb-4 mb-5
              border-b p-1
              font-myCustomFont
              text-center
              flex flex-col
              justify-center
              items-center
              gap-3
              bg-gradient-to-r from-gray-500 via-gray-600 to-gray-800 bg-clip-text text-transparent
          `}
        >
          <Image priority src={NovaLogo} alt={'Nova Logo'} height={40} />
          <span>Platinum Support</span>
        </div>
        <div className="text-center text-xl text-left mt-[.75rem] text-[#142d50] font-medium my-5">
          Forgot Password Form
        </div>
      </div>

      <div className="w-[300px]">
        <form onSubmit={formik.handleSubmit}>
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          <div ref={userNamePasswordGroupRef} className="mb-5">
            {showOTP && <p className="text-xs text-center pb-2">Your Email</p>}
            <div className="mb-5">
              <label className="input input-bordered flex items-center gap-2 dark:bg-white ">
                <MdOutlineMailLock />
                <input
                  ref={emailRef}
                  type="text"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={clsx('grow text-black', {
                    'text-white bg-black': emailFieldIsReadOnly === true,
                  })}
                  placeholder="Your Email Address"
                  disabled={emailFieldIsReadOnly}
                />
              </label>
              <FieldError formik={formik} name="email" />
            </div>
          </div>
          {config.CaptchaIsActiveForPasswordReset && !captchaVerified && (
            <div
            // style={
            //   captchaVerified
            //     ? { pointerEvents: 'none', opacity: 0.6 } // Disable interaction and reduce opacity after verification
            //     : {}
            // }
            >
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                onChange={handleCaptchaChange}
              />
            </div>
          )}
          {showOTP && !totpVerified && (
            <div>
              <p className="text-xs pt-2 pb-1 ">
                Please enter your OTP code that you received by SMS
              </p>
              <p className="text-xs text-center pb-2">
                Remaining time {formatTimeMMSS(timeLeft)}
              </p>
              <TwoFactAuth
                value={totpCode}
                onChange={(val) => setTotpCode(val)}
              />
            </div>
          )}
          {showEmailTokenField && (
            <div className="my-5 border p-3">
              <p className="text-sm text-center mb-3">
                Please provide the token that you have received in your e-mail
                address
              </p>
              <label className="input input-bordered flex items-center gap-2 dark:bg-white ">
                <FaKey />
                <input
                  type="text"
                  name="tokenForEmail"
                  value={formik.values.tokenForEmail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="grow text-black"
                  placeholder="Your Token"
                />
              </label>
              <FieldError formik={formik} name="tokenForEmail" />
            </div>
          )}
          {error && <p className="pt-2 text-red-500 text-center">{error}</p>}
          <div className="mt-5 flex justify-around">
            <SignInButton
              pending={formik.isSubmitting}
              label={submitButtonLabel}
              loadingText="Loading ..."
              isValid={formik.isValid}
              // className="btn btn-primary py-4 px-5 font-semibold text-white "
            />
          </div>
        </form>
      </div>
    </div>
  );
}

const SignInButton = ({
  pending,
  label,
  loadingText,
  isValid,
}: {
  pending: boolean;
  label: string;
  loadingText: string;
  isValid: boolean;
}) => {
  return (
    <button
      className={clsx(
        `btn transition-all duration-300 ease-in-out bg-gradient-to-r from-gray-800 via-black to-gray-900
         text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:from-gray-700 hover:via-gray-800 hover:to-gray-700 
         hover:scale-105 transform border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 
         focus:ring-gray-600 focus:ring-offset-gray-100
        `,
        {
          'cursor-not-allowed opacity-70': pending,
        }
      )}
      style={{
        width: '105px',
      }}
      disabled={pending}
      type="submit"
      aria-disabled={pending}
    >
      {pending ? (
        <span className="text-white-500">{loadingText}</span>
      ) : (
        <span className="text-white-500">{label}</span>
      )}
    </button>
  );
};
