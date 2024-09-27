'use client';

import { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { FaKey } from 'react-icons/fa';
import clsx from 'clsx';
import { config } from '@b2b-tickets/config';
import { TwoFactAuth } from './TwoFactAuth';
import { ErrorCode } from '@b2b-tickets/shared-models';

const FieldError = ({ formik, name }) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return <p className="text-red-500 text-sm">{formik?.errors[name]}</p>;
};

export default function SignInForm({ providers, csrfToken }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [captcha, setCaptcha] = useState();
  const [showOTP, setShowOTP] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const [error, setError] = useState(null);
  const [loading, setIsLoading] = useState(false);

  const [callbackUrl, setCallbackUrl] = useState('/');

  const [tokenTimeisRunning, setTokenTimeisRunning] = useState(false);
  const [tokenTimeLeft, setTokenTimeLeft] = useState(
    config.TwoFactorValiditySeconds -
      (Math.floor(Date.now() / 1000) % config.TwoFactorValiditySeconds)
  );

  const [submitButtonLabel, setSubmitButtonLabel] = useState('Sign in');
  // Create references to User Name & Password fields
  const userNameRef = useRef(null);
  const userNameLabelRef = useRef(null);
  const passwordRef = useRef(null);
  const passwordLabelRef = useRef(null);
  const userNamePasswordGroupRef = useRef(null);
  const captchaRef = useRef(null);

  // Create a reference for reCAPTCHA
  const recaptchaRef = useRef(null); // New useRef for reCAPTCHA

  useEffect(() => {
    let intervalId;
    if (tokenTimeisRunning) {
      // Create a timer that updates every second
      intervalId = setInterval(() => {
        setTokenTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
    }

    // Clear the interval on component unmount or when the timer stops
    return () => clearInterval(intervalId);
  }, [tokenTimeisRunning]);

  // Format the time left into MM:SS format
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  };

  // When the Token Remainng Time reaches 0, perform full web page refresh
  if (tokenTimeLeft === 0 && tokenTimeisRunning) {
    setTokenTimeisRunning(false); // Stop the timer
    window.location.href = '/';
  }

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
  });

  const formik = useFormik({
    initialValues: {
      userName: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (config.CaptchaIsActive) {
        if (!captcha) {
          setError('Verify reCAPTCHA!');
          setSubmitting(false);

          return;
        }
      }
      setError(null);
      setIsLoading(true);

      const response = await signIn('credentials', {
        redirect: false,
        userName: values.userName,
        password: values.password,
        captchaToken: captcha,
        totpCode,
      });

      if (response?.ok) {
        window.location.href = callbackUrl;
        setTokenTimeisRunning(false);
        return;
      }

      console.log('response?.error', response?.error);
      switch (response?.error.replace('Error: ', '')) {
        case ErrorCode.UserIsLocked:
          setError('User is currently locked');
          setIsLoading(false);
          break;

        case ErrorCode.CaptchaValidationFailed:
          setError('Invalid reCAPTCHA validation');
          setIsLoading(false);
          if (config.CaptchaIsActive) recaptchaRef.current.reset();
          break;

        case ErrorCode.IncorrectUsernameOrPassword:
          console.log(147);
          setError('Invalid user name or password');
          setIsLoading(false);
          if (config.CaptchaIsActive) recaptchaRef.current.reset();
          break;

        case ErrorCode.IncorrectTwoFactorCode:
          setError('Invalid OTP Code provided');
          setIsLoading(false);
          break;

        case ErrorCode.SecondFactorRequired:
          setTokenTimeisRunning(true);
          setShowOTP(true);
          setIsLoading(false);
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

          if (captchaRef.current) {
            captchaRef.current.disabled = true;
          }

          break;
        case ErrorCode.InternalServerError:
          setError('Internal Server Error');
          setIsLoading(false);
          break;

        default:
          return;
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
      <div
        // className={`font-black justify-center tracking-wider text-2xl bg-gradient-to-r from-[#262953] to-[#3f3d3d] inline-block text-transparent bg-clip-text mb-7`}
        className={`w-[300px] mb-2`}
        // style={{
        //   fontFamily: 'Manrope, sans-serif',
        //   textAlign: 'center',
        // }}
      >
        <div
          className={`text-3xl tracking-widest text-[#262953] font-bold
                        border-[#7b7b7c] pb-5 mb-5
              border-b p-1
              font-myCustomFont
              text-center
          `}
          // style={{
          //   fontFamily: 'Courier New',
          // }}
        >
          NOVA Platinum Support
        </div>
        <div className="text-xl text-left mt-[.75rem] text-[#1e225b] font-semibold">
          Login
        </div>
      </div>

      <div className="w-[300px]">
        <form onSubmit={formik.handleSubmit}>
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
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
                />
              </label>
              <FieldError formik={formik} name="password" />
            </div>
          </div>
          {config.CaptchaIsActive ? (
            <div>
              {!showOTP ? (
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  onChange={setCaptcha}
                />
              ) : null}
            </div>
          ) : null}
          {showOTP && (
            <div>
              <p className="text-xs pt-2 pb-1 ">
                Please enter your OTP code that you received by SMS
              </p>
              <p className="text-xs text-center pb-2">
                Remaining time {formatTime(tokenTimeLeft)}
              </p>
              <TwoFactAuth
                value={totpCode}
                onChange={(val) => setTotpCode(val)}
              />
            </div>
          )}
          {error && <p className="pt-2 text-red-500 text-center">{error}</p>}
          <div className="mt-5 flex justify-around">
            <SignInButton
              pending={formik.isSubmitting}
              label={submitButtonLabel}
              loadingText="Loading ..."
              isValid={formik.isValid}
              isDirty={formik.dirty}
              className="btn btn-primary py-4 px-5 font-semibold text-white "
              loading={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

const SignInButton = ({ pending, label, loadingText, isValid, loading }) => {
  return (
    <button
      className={clsx(
        `btn btn-primary bg-[#262953] text-white shadow-md hover:bg-[#2a2c53] hover:cursor-pointer
        border border-[#262953]
        `,
        {
          'text-white-500 cursor-not-allowed': pending || loading,
        }
      )}
      style={{
        width: '105px',
      }}
      disabled={pending || loading}
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
