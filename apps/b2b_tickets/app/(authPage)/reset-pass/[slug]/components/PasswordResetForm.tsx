'use client';
import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
// import ReCAPTCHA from 'react-google-recaptcha';
import { useReCaptcha } from 'next-recaptcha-v3';

import { useFormik, FormikTouched, FormikErrors } from 'formik';
import * as Yup from 'yup';
import clsx from 'clsx';
import { MdOutlineMailLock } from 'react-icons/md';
import { FaKey } from 'react-icons/fa';

import { config } from '@b2b-tickets/config';
import { TwoFactAuth } from './TwoFactAuth';
import { ErrorCode } from '@b2b-tickets/shared-models';
import { useCountdown } from '@b2b-tickets/react-hooks';
import { formatTimeMMSS, passwordComplexitySchema } from '@b2b-tickets/utils';
import { NovaLogo } from '@b2b-tickets/assets';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { PasswordComplexityAnnouncement } from '@b2b-tickets/ui';

export function PasswordResetForm({
  csrfToken,
  jwtToken,
}: {
  csrfToken: string;
  jwtToken: string;
}) {
  const [loadingState, setLoadingState] = useState(true);
  const [linkIsValid, setLinkIsValid] = useState(true);

  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const [totpVerified, setTotpVerified] = useState(false);
  // const [totpCode, setTotpCode] = useState('');

  const [buttonIsDisabled, setButtonIsDisabled] = useState(false);
  const [buttonIsShown, setButtonIsShown] = useState(true);

  const [showOTP, setShowOTP] = useState(false);

  const [showEmailTokenField, setShowEmailTokenField] = useState(false);
  const [showNewPasswordField, setShowNewPasswordField] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { executeRecaptcha } = useReCaptcha();

  const submitButtonLabel = 'Submit';
  const successMessage = 'Password Successfully updated!';
  const recaptchaRef = useRef<any>(); // New useRef for reCAPTCHA

  const validationSchema = Yup.object({
    email: Yup.string().required('Email is required'),
    totpCode: !showOTP
      ? Yup.string()
      : Yup.string()
          .matches(/^\d{5}$/, ' ')
          .required('OTP Code is required'),
    tokenForEmail: !showEmailTokenField
      ? Yup.string()
      : Yup.string().required('Email Token is required'),
    newPassword: !showNewPasswordField
      ? Yup.string()
      : config.PasswordComplexityActive
      ? passwordComplexitySchema
      : Yup.string().required('Password is required'),
    repeatNewPassword: !showNewPasswordField
      ? Yup.string()
      : Yup.string()
          .oneOf([Yup.ref('newPassword')], 'Passwords must match')
          .required('Please confirm your password'),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      totpCode: '',
      tokenForEmail: '',
      newPassword: '',
      repeatNewPassword: '',
    },
    validationSchema: validationSchema,
    validate: async (values) => {
      try {
        // Validate with abortEarly: false to gather all errors
        await validationSchema.validate(values, { abortEarly: false });
        setButtonIsDisabled(false);
      } catch (err) {
        // Explicitly define err as Yup.ValidationError
        if (err instanceof Yup.ValidationError) {
          const errors: Record<string, string> = {};
          err.inner.forEach((validationError) => {
            if (validationError.path) {
              errors[validationError.path] = validationError.message;
            }
          });
          return errors;
        }
      }
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true); // Disable the submit button
      setError(null);

      let captchaV3token = null;
      // Generate ReCaptcha token
      if (config.CaptchaIsActiveForPasswordReset)
        captchaV3token = await executeRecaptcha('form_submit');

      if (
        config.TwoFactorEnabledForPasswordReset &&
        !totpVerified &&
        formik.values.totpCode
      ) {
        await getTotpJWTToken({
          emailProvided: formik.values.email,
          setSubmitting,
        });
      }

      const response = await signIn('credentials-password-reset', {
        redirect: false,
        email: values.email,
        captchaToken: captchaV3token,
        tokenForEmail: formik.values.tokenForEmail,
        newPassword: formik.values.newPassword,
      });

      if (!response) return;

      if (response.ok) {
        setError(successMessage);
        // window.location.href = '/';
      }

      const error = response?.error?.replace('Error: ', '');

      // If no error field exists or it's empty, return early
      if (!error) return;

      switch (error) {
        case ErrorCode.EmailIsRequired:
          setError('Email is Required');
          setSubmitting(false);
          break;
        case ErrorCode.IfAccountExistsYouWillReceivePasswordResetLink:
          setError(
            'If an account with this email exists, you will receive a password reset link shortly.'
          );
          setSubmitting(false);
          if (config.CaptchaIsActiveForPasswordReset) {
            setCaptchaVerified(false);
            if (recaptchaRef.current) {
              recaptchaRef.current.reset();
            }
          }
          setButtonIsShown(false);
          break;
        case ErrorCode.TotpJWTTokenRequired:
          resetTimer(
            config.TwoFactorValiditySeconds -
              (Math.floor(Date.now() / 1000) % config.TwoFactorValiditySeconds)
          );
          start();

          setShowOTP(true);
          setSubmitting(false);
          setButtonIsDisabled(true);
          break;
        case ErrorCode.TotpJWTTokenInvalid:
          setShowOTP(true);
          setSubmitting(false);
          setError('Token Invalid');
          break;
        case ErrorCode.CaptchaJWTTokenRequired:
          window.location.reload();
          break;
        case ErrorCode.TokenForEmailRequired:
          setSubmitting(false);
          setCaptchaVerified(true);
          setShowEmailTokenField(true);
          getEmailJWTToken({
            emailProvided: formik.values.email,
            setSubmitting,
          });
          setButtonIsDisabled(true);
          break;
        case ErrorCode.IncorrectPassResetTokenProvided:
          setSubmitting(false);
          setError('Incorrect Token provided');
          break;
        case ErrorCode.NewPasswordRequired:
          setShowEmailTokenField(false);
          setShowNewPasswordField(true);
          setError('');
          setButtonIsDisabled(true);
          break;
        default:
          setError('Internal Server Error');
          setSubmitting(false);
          break;
      }
    },
  });

  useEffect(() => {
    // Call the API route to clear HTTP-only cookies
    const getEmail = async () => {
      const resp = await fetch('/api/user/resetPassToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwtTokenEnc: jwtToken,
        }),
      });

      if (!resp.ok) {
        setLinkIsValid(false);
        setLoadingState(false);
        setError('The Link is no longer valid');
        return;
      }

      const result = await resp.json();
      formik.setFieldValue('email', result.email);
      setLoadingState(false);
    };

    getEmail();
  }, []);

  const { timeLeft, start, resetTimer } = useCountdown(0, () => {
    // When the Token Remainng Time reaches 0, perform full web page refresh
    window.location.reload();
  });

  // Clear Old Cookies for this procedure
  useEffect(() => {
    // Call the API route to clear HTTP-only cookies
    const clearCookies = async () => {
      await fetch('/api/auth/clear', {
        method: 'POST',
      });
    };

    clearCookies();
  }, []);

  const getReCaptchaJWTToken = async ({
    emailProvided,
    setSubmitting,
  }: any) => {
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
        body: JSON.stringify({ emailProvided, captchaToken: captcha }),
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

  const getTotpJWTToken = async ({ emailProvided, setSubmitting }: any) => {
    if (!formik.values.totpCode) {
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
        body: JSON.stringify({
          emailProvided,
          totpCode: formik.values.totpCode,
        }),
      });

      const totpResult = await totpResponse.json();

      if (!totpResponse.ok) {
        setError(totpResult.message || 'Invalid TOTP Code');
        setSubmitting(false);
        return;
      }

      // Server Verified Totp at this point
      resetTimer(300);
      setTotpVerified(true);
    } catch (error) {
      setError('An error occurred while validating TOTP. Please try again.');
      setSubmitting(false);
      return;
    }
  };

  const getEmailJWTToken = async ({ emailProvided, setSubmitting }: any) => {
    try {
      // Call your custom token validation API route
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailProvided }),
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok) {
        setError(tokenResult.message || 'Invalid Email Token Code');
        setSubmitting(false);
        return;
      }
    } catch (error) {
      setError('An error occurred while validating TOTP. Please try again.');
      setSubmitting(false);
      return;
    }
  };

  // const PasswordComplexityAnnouncement = () => {
  //   return (
  //     <div className="text-xs border p-2">
  //       <p className="text-center mb-2">Password Complexity Rules</p>
  //       <ol className="font-light">
  //         <li>At least 8 characters long</li>
  //         <li>At least one uppercase letter</li>
  //         <li>At least one lowercase letter</li>
  //         <li>At least one number</li>
  //         <li>
  //           At least one special character [&#33; &#64; &#35; &#36; &#37; &#94;
  //           &#38; &#42; &#40; &#41; &#44; &#46; &#63; &#58; &#34; &#123; &#125;
  //           &#124; &#60; &#62;]
  //         </li>
  //       </ol>
  //     </div>
  //   );
  // };

  return (
    <div
      className={`w-[450px] relative shadow-md rounded-2xl flex flex-col justify-center items-center p-6  backdrop-blur-lg bg-gray-100 border border-[#26295375]`}
      style={{ transform: 'translateY(-20%)' }}
    >
      <div className={`w-[350px] mb-2`}>
        <div
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
            height={40}
            width={245}
          />
          <span>Platinum Support</span>
        </div>
        <div className="text-center text-xl mt-[.75rem] text-[#6C757D] font-medium my-5">
          Activate Your Account
        </div>
      </div>

      <div className="w-[350px]">
        <form onSubmit={formik.handleSubmit} autoComplete="off">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          {!loadingState && linkIsValid ? (
            <>
              <div className="mb-5">
                {showOTP && (
                  <p className="text-xs text-center pb-2">Email Provided</p>
                )}
                <div className="mb-5">
                  <label
                    style={{
                      border: '1px solid #888',
                    }}
                    className={`input flex items-center gap-2`}
                  >
                    <MdOutlineMailLock size={25} color="rgba(0,0,0,.55)" />
                    <input
                      type="text"
                      name="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full pl-2 disabled:text-black/75 disabled:bg-gray dark:disabled:bg-gray"
                      placeholder="Your Email Address"
                      readOnly={true}
                      disabled={true}
                    />
                  </label>
                  <div className="text-center mt-3">
                    <FieldError formik={formik} name="email" />
                  </div>
                </div>
                {showNewPasswordField && (
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
              </div>
              {config.CaptchaIsActiveForPasswordReset && !captchaVerified && (
                <div
                  style={{
                    transform: 'scale(1.16)',
                    WebkitTransform: 'scale(1.16)',
                    transformOrigin: '0 0',
                    WebkitTransformOrigin: '0 0',
                  }}
                ></div>
              )}
            </>
          ) : (
            loadingState && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            )
          )}

          {config.TwoFactorEnabledForPasswordReset && showOTP && !totpVerified && (
            <div>
              <p className="text-xs pt-2 mb-2 text-center">
                Please enter the OTP code that you have received
                <br />
                by E-mail/SMS
              </p>
              <p className="text-xs text-center pb-2">
                Remaining time {formatTimeMMSS(timeLeft)}
              </p>
              <TwoFactAuth
                value={formik.values.totpCode}
                onChange={(val) => formik.setFieldValue('totpCode', val)}
              />
              <div className="text-center mt-3">
                <FieldError formik={formik} name="totpCode" />
              </div>
            </div>
          )}
          {showEmailTokenField && (
            <div className="my-5 border p-3 rounded-md">
              <p className="text-sm text-center mb-3">
                Please provide the token that you have received at your E-mail
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
              <div className="text-center mt-3">
                <FieldError formik={formik} name="tokenForEmail" />
              </div>
            </div>
          )}
          {error && (
            <p
              className={clsx('mt-3 text-center text-green-500', {
                'text-red-500': error !== successMessage,
              })}
            >
              {error}
            </p>
          )}

          {error !== successMessage ? (
            !loadingState &&
            linkIsValid && (
              <div className="mt-5 flex justify-around">
                {buttonIsShown && (
                  <SignInButton
                    pending={formik.isSubmitting}
                    label={submitButtonLabel}
                    loadingText="Loading ..."
                    isValid={formik.isValid && !buttonIsDisabled}
                    // className="btn btn-primary py-4 px-5 font-semibold text-white "
                  />
                )}
              </div>
            )
          ) : (
            <div className="mt-5 mb-2 flex justify-around border bg-[#2b2b44] py-1 text-white rounded-md">
              <Link href="/">Proceed To Home Page</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

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
