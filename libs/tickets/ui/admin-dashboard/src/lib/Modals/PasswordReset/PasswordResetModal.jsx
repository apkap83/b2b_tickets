'use client';

import React, { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { FaKey, FaTimes } from 'react-icons/fa';
import { FaUserLarge } from 'react-icons/fa6';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { updateUserPassword } from '@b2b-tickets/admin-server-actions';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { SubmitButton } from '../../common/SubmitButton';
import { CancelButton } from '../../common/CancelButton';
import {
  passwordComplexitySchema,
  getUserIdentifier,
} from '@b2b-tickets/utils';

const validationSchema = Yup.object({
  password: passwordComplexitySchema,
  verifyPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Verify Password is required'),
});

export const PasswordResetModal = ({ userDetails }) => {
  const router = useRouter();
  const [formState, action] = useFormState(
    updateUserPassword,
    EMPTY_FORM_STATE
  );
  const noScriptFallback = useToastMessage(formState);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
      verifyPassword: '',
    },
    validationSchema: validationSchema,
    validate: async (values) => {
      try {
        await validationSchema.validate(values, { abortEarly: false });
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = {};
          err.inner.forEach((validationError) => {
            if (validationError.path) {
              errors[validationError.path] = validationError.message;
            }
          });
          return errors;
        }
      }
    },
  });

  const closeModal = () => {
    router.push('/profile');
  };

  useEffect(() => {
    if (formState.status === 'SUCCESS') {
      closeModal();
    }
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-black px-6 py-5 rounded-t-2xl border-b-4 border-gray-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-wide">
            Reset Password
          </h3>
          <button
            onClick={closeModal}
            className="text-white hover:text-gray-300 transition-colors p-1 hover:bg-gray-800 rounded-full"
            aria-label="Close modal"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-2">
            <UserInfoRow label="First Name" value={userDetails.firstName} />
            <UserInfoRow label="Last Name" value={userDetails.lastName} />
          </div>
        </div>

        {/* Form Section */}
        <div className="px-6 py-6">
          <form className="flex flex-col gap-4" action={action}>
            <input type="hidden" name="email" value={userDetails.email} />

            {/* Username Field (Read-only) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUserLarge className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={getUserIdentifier(
                    userDetails.userName,
                    userDetails.email
                  )}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium focus:outline-none cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaKey className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-20 transition-all outline-none"
                  placeholder="Enter new password"
                />
              </div>
              <FieldError formik={formik} name="password" />
            </div>

            {/* Verify Password Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaKey className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="verifyPassword"
                  value={formik.values.verifyPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-20 transition-all outline-none"
                  placeholder="Confirm new password"
                />
              </div>
              <FieldError formik={formik} name="verifyPassword" />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-20 pt-4">
              <SubmitButton
                label="Update Password"
                loading="Updating..."
                isValid={formik.isValid}
                isDirty={formik.dirty}
                className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold uppercase tracking-wide py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
              />

              <CancelButton
                onClick={closeModal}
                className="btn btn-secondary btn-sm"
              />
            </div>

            {noScriptFallback}
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper component for user info rows
const UserInfoRow = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-gray-600 uppercase tracking-wide text-xs">
        {label}:
      </span>
      <span className="font-semibold text-black break-words text-right max-w-[65%]">
        {value}
      </span>
    </div>
  );
};
