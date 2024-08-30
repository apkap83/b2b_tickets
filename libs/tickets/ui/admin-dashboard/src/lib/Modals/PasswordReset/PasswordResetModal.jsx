'use client';
import React, { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { FaKey } from 'react-icons/fa';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { updateUserPassword } from '@b2b-tickets/admin-server-actions';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { SubmitButton } from '../../common/SubmitButton';
import { FaUserLarge } from 'react-icons/fa6';

const validationSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters long')
    .required('Password is required'),
  verifyPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Verify Password is required'),
});

export const PasswordResetModal = ({ userDetails, closeModal }) => {
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
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ">
      <div className="bg-white px-8 py-3 rounded-lg w-[400px] border-[1px] shadow-2xl border-purple-400">
        <h3 className="font-bold text-lg text-center mt-3">
          Update Password for User
        </h3>

        <div className="flex justify-center">
          <ul
            className="inline-block text-md list-none justify-center mt-5 mb-4 border p-2"
            //   style={{ transform: "translateX(-50%)" }}
          >
            <li className="whitespace-nowrap">
              First Name: {userDetails.firstName}
            </li>
            <li className="whitespace-nowrap">
              Last Name: {userDetails.lastName}
            </li>
            {/* <li className="whitespace-nowrap">
              User Name: {userDetails.userName}
            </li> */}
          </ul>
        </div>

        <div className="flex justify-center">
          <form
            className="flex flex-col gap-3 pt-3 mx-4 w-[300px]"
            action={action}
          >
            <label className="input input-bordered flex items-center gap-2 text-gray-400">
              <FaUserLarge className="w-4 h-4 opacity-70 " />
              <input
                type="text"
                name="username"
                value={userDetails.userName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
                placeholder="User Name"
                readOnly
              />
            </label>

            <label className="input input-bordered flex items-center gap-2">
              <FaKey className="w-4 h-4 opacity-70" />
              <input
                type="password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
                placeholder="Password"
              />
            </label>
            <FieldError formik={formik} name="password" />

            <label className="input input-bordered flex items-center gap-2">
              <FaKey className="w-4 h-4 opacity-70" />
              <input
                type="password"
                name="verifyPassword"
                value={formik.values.verifyPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
                placeholder="Verify Password"
              />
            </label>
            <FieldError formik={formik} name="verifyPassword" />
            {/* {formik.errors && (
              <p className="text-red-500 text-center">
                {Object.values(formik.errors).join(", ")}
              </p>
            )} */}
            <div className="mt-5 flex justify-around">
              <SubmitButton
                label="Update"
                loading="Updating ..."
                isValid={formik.isValid}
                isDirty={formik.dirty}
              />

              <button className="btn btn-" onClick={closeModal}>
                Close
              </button>

              {noScriptFallback}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
