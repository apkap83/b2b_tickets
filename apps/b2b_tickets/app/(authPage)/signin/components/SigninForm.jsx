'use client';

import { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
// import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import * as Yup from 'yup';

import { FaKey } from 'react-icons/fa';
import clsx from 'clsx';
import { config } from '@b2b-tickets/config';

const FieldError = ({ formik, name }) => {
  if (!formik?.touched[name] || !formik?.errors[name]) {
    return null;
  }

  return <p className="text-red-500 text-sm">{formik?.errors[name]}</p>;
};

export default function SignInForm({ providers, csrfToken }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setIsLoading] = useState(false);

  const [callbackUrl, setCallbackUrl] = useState('/');

  // Create a reference for reCAPTCHA
  const recaptchaRef = useRef(null); // New useRef for reCAPTCHA

  const [captcha, setCaptcha] = useState();

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
      // userName: "",
      // password: "",
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

      const result = await signIn('credentials', {
        redirect: false,
        userName: values.userName,
        password: values.password,
        captchaToken: captcha,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        recaptchaRef.current.reset(); // Reset reCAPTCHA on invalid credentials
        return;
      }
      window.location.href = callbackUrl;
    },
  });

  const handleSubmit = async (e) => {};

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
          <div className="mb-5">
            <label className="input input-bordered flex items-center gap-2 dark:bg-white ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-4 h-4 opacity-70"
              >
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
              </svg>
              <input
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

          <div className="mb-5">
            <label className="input input-bordered flex items-center gap-2 dark:bg-white dark:text-black">
              <FaKey className="w-4 h-4 opacity-70" />
              <input
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

          {config.CaptchaIsActive ? (
            <div>
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={setCaptcha}
              />
            </div>
          ) : null}
          {/* <div>
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={setCaptcha}
            />
          </div> */}
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="mt-5 flex justify-around">
            <SignInButton
              pending={formik.isSubmitting}
              label="Sign in"
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
