'use client';

import { useState, useEffect, useRef } from 'react';

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
import { formatTimeMMSS, passwordComplexitySchema } from '@b2b-tickets/utils';
import { NovaLogo } from '@b2b-tickets/assets';
import { useReCaptcha } from 'next-recaptcha-v3';
import { PasswordComplexityAnnouncement } from '@b2b-tickets/ui';

import Link from 'next/link';
import styles from './css/signin.module.scss';

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

export default function SignInForm({ csrfToken }: { csrfToken: string }) {
  const { status } = useSession();
  const router = useRouter();

  const [showOTP, setShowOTP] = useState(false);
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false);

  const [totpCode, setTotpCode] = useState('');

  const [title, setTitle] = useState('Sign In');

  const [error, setError] = useState<string | null>(null);

  const [callbackUrl, setCallbackUrl] = useState('/');

  const [submitButtonLabel, setSubmitButtonLabel] = useState('Submit');

  // Import 'executeRecaptcha' using 'useReCaptcha' hook
  const { executeRecaptcha } = useReCaptcha();

  // Create references to User Name & Password fields
  const userNameRef = useRef<HTMLInputElement | null>(null);
  const userNameLabelRef = useRef(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const passwordLabelRef = useRef(null);
  const userNamePasswordGroupRef = useRef<HTMLDivElement | null>(null);

  const { timeLeft, start, resetTimer } = useCountdown(0, () => {
    // When the Token Remainng Time reaches 0, perform full web page refresh
    window.location.reload();
    // router.reload();
  });
  const successMessage = 'Password Successfully updated!';

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

  const validationSchema = Yup.object({
    userName: Yup.string().required('User name is required'),
    password: Yup.string().required('Password is required'),
    newPassword: !showNewPasswordFields
      ? Yup.string()
      : config.PasswordComplexityActive
      ? passwordComplexitySchema
      : Yup.string().required('Password is required'),
    repeatNewPassword: !showNewPasswordFields
      ? Yup.string()
      : Yup.string()
          .oneOf([Yup.ref('newPassword')], 'Passwords must match')
          .required('Please confirm your password'),
  });

  const formik = useFormik({
    initialValues: {
      userName: '',
      password: '',
      newPassword: '',
      repeatNewPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true); // Disable the submit button
      setError(null);

      // Generate ReCaptcha token
      const captchaV3token = await executeRecaptcha('form_submit');

      const response = await signIn('credentials-login', {
        redirect: false,
        userName: values.userName,
        password: values.password,
        // captchaToken: captcha,
        captchaToken: captchaV3token,
        totpCode,
        newPassword: formik.values.newPassword,
      });

      if (!response) return;

      if (response.ok) {
        window.location.href = callbackUrl;
      }

      const error = response?.error?.replace('Error: ', '');

      // If no error field exists or it's empty, return early
      if (!error) return;

      switch (error) {
        case ErrorCode.CaptchaJWTTokenRequired:
          setError('Captcha Verification is Required');
          setSubmitting(false);
          break;
        case ErrorCode.CaptchaJWTTokenInvalid:
          setError('Captcha JWT Token Invalid');
          setSubmitting(false);
          break;
        case ErrorCode.UserIsLocked:
          setError('User is currently locked');
          setSubmitting(false);
          break;
        case ErrorCode.IncorrectUsernameOrPassword:
          setError('Invalid user name or password');
          setSubmitting(false);
          break;
        case ErrorCode.IncorrectTwoFactorCode:
          setError('Invalid OTP Code provided');
          setSubmitting(false);
          break;
        case ErrorCode.SecondFactorRequired:
          resetTimer(
            config.TwoFactorValiditySeconds -
              (Math.floor(Date.now() / 1000) % config.TwoFactorValiditySeconds)
          );
          start();
          setShowOTP(true);
          setSubmitting(false);
          setSubmitButtonLabel('Submit OTP');

          if (userNamePasswordGroupRef.current) {
            userNamePasswordGroupRef.current.style.border = '1px dashed green';
            userNamePasswordGroupRef.current.style.padding = '10px';
          }

          if (userNameRef.current) {
            userNameRef.current.readOnly = true;
          }

          if (passwordRef.current) {
            passwordRef.current.readOnly = true;
          }

          break;
        case ErrorCode.InternalServerError:
          setError('Internal Server Error');
          setSubmitting(false);
          break;
        case ErrorCode.NoRoleAssignedToUser:
          setError('No Role Assigned');
          setSubmitting(false);
          break;
        case ErrorCode.NewPasswordRequired:
          setShowNewPasswordFields(true);
          setSubmitting(false);
          setShowOTP(false);
          setSubmitButtonLabel('Set New Password');
          setTitle('Please Change Your Password');
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
      className={`${styles.loginRectangle} w-[500px] relative shadow-md rounded-2xl flex flex-col justify-center 
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
          <Image
            priority
            src={NovaLogo}
            alt={'Nova Logo'}
            className="w-[250px]"
          />
          <span>Platinum Support</span>
        </div>
        {process.env['NEXT_PUBLIC_APP_ENV'] === 'staging' &&
          process.env['NODE_ENV'] === 'production' && (
            <div className="flex items-center justify-center h-12 ">
              <div className="px-2 opacity-80 text-center text-lg text-pink-900 border border-dashed border-pink-900 mx-auto h-auto shadow-white shadow-sm">
                Staging Environment
              </div>
            </div>
          )}
        {process.env['NODE_ENV'] === 'development' && (
          <div className="flex items-center justify-center h-12">
            <div className="px-2 opacity-80 text-center text-lg text-pink-900 border border-dashed border-pink-900 mx-auto h-auto shadow-white shadow-sm">
              Development Environment
            </div>
          </div>
        )}
        <div
          className={clsx('text-xl  mt-[.75rem] text-[black] font-semibold', {
            'text-center': title === 'Please Change Your Password',
            'text-left': title === 'Sign In',
          })}
        >
          {title}
        </div>
      </div>

      <div className="w-[300px]">
        <form onSubmit={formik.handleSubmit} autoComplete="off">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          {!showNewPasswordFields && (
            <div ref={userNamePasswordGroupRef} className="mb-5">
              {showOTP && (
                <p className="text-xs text-center pb-2">Your Credentials</p>
              )}
              <div className="mb-5">
                <label
                  ref={userNameLabelRef}
                  className="input input-bordered flex items-center gap-2 dark:bg-white "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                  <input
                    ref={userNameRef}
                    type="text"
                    name="userName"
                    value={formik.values.userName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow text-black"
                    placeholder="User Name"
                    autoComplete="false"
                  />
                </label>
                <FieldError formik={formik} name="userName" />
              </div>

              <div className="">
                <label
                  ref={passwordLabelRef}
                  className="input input-bordered flex items-center gap-2 dark:bg-white dark:text-black"
                >
                  <FaKey className="w-4 h-4 opacity-70" />
                  <input
                    ref={passwordRef}
                    type="password"
                    name="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow text-black"
                    placeholder="Password"
                    autoComplete="false"
                  />
                </label>
                <FieldError formik={formik} name="password" />
              </div>
              {!showOTP && (
                <div className="my-1 text-right">
                  <Link
                    className="text-xs text-[#6C757D] hover:text-[#4A90E2]"
                    href="/forgotCred"
                  >
                    Forgot Your Password ?
                  </Link>
                </div>
              )}
            </div>
          )}
          {showOTP && (
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

          {showNewPasswordFields && (
            <>
              <PasswordComplexityAnnouncement />
              <div className="mb-5 border p-2">
                <label className="input input-bordered flex items-center gap-2 dark:bg-white  ">
                  <FaKey />
                  <input
                    type="password"
                    name="newPassword"
                    value={formik.values.newPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={clsx('grow text-black', {})}
                    placeholder="New Password"
                    readOnly={error === successMessage}
                  />
                </label>
                <label className="mt-3 input input-bordered flex items-center gap-2 dark:bg-white  ">
                  <FaKey />
                  <input
                    type="password"
                    name="repeatNewPassword"
                    value={formik.values.repeatNewPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={clsx('grow text-black', {})}
                    placeholder="Repeat Password"
                    readOnly={error === successMessage}
                  />
                </label>
                <div className="text-xs text-red-900 mt-1">
                  {formik.errors['newPassword'] ||
                    formik.errors['repeatNewPassword']}
                </div>
              </div>
            </>
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
         focus:ring-gray-600 focus:ring-offset-gray-100 disabled:bg-gray-500 disabled:text-gray-300 
        `,
        {
          'cursor-not-allowed opacity-70': pending,
        }
      )}
      style={{
        width: '105px',
      }}
      disabled={pending || !isValid}
      type="submit"
      aria-disabled={pending || !isValid}
    >
      {pending ? (
        <span className="text-white-500">{loadingText}</span>
      ) : (
        <span className="text-white-500">{label}</span>
      )}
    </button>
  );
};
