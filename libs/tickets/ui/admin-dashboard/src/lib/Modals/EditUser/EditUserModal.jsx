import React, { useEffect, useActionState } from 'react';
import * as Yup from 'yup';
import { useFormik, Field } from 'formik';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { CgNametag } from 'react-icons/cg';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { SubmitButton } from '../../common/SubmitButton';
import { CancelButton } from '../../common/CancelButton';
import { editUser } from '@b2b-tickets/admin-server-actions';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';

const validationSchema = Yup.object({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  userName: Yup.string().required('User name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  mobilePhone: Yup.string(),
});

const EditUserModal = ({ userDetails, rolesList, closeModal }) => {
  const [formState, action] = useActionState(editUser, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);

  const checkIfUserHasRole = (user, role) => {
    if (!userDetails.hasOwnProperty('AppRoles')) return false;

    for (let i = 0; i < user.AppRoles.length; i++) {
      if (role.id === userDetails.AppRoles[i].id) {
        return true;
      }
    }
    return false;
  };

  const formik = useFormik({
    initialValues: {
      userId: userDetails.user_id,
      firstName: userDetails.first_name,
      lastName: userDetails.last_name,
      userName: userDetails.username,
      email: userDetails.email,
      mobilePhone: userDetails.mobile_phone,
      roles: {},
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-[800px] max-h-[75vh] px-8 py-4 border-[1px] border-blue-900 shadow-2xl rounded-lg overflow-y-auto">
        <h3 className="font-bold text-lg text-center">Edit User Form</h3>

        <form className="flex flex-col gap-3 pt-3" action={action}>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">First Name</span>
                </div>

                <input
                  type="hidden"
                  name="userId"
                  value={formik.values.userId}
                />

                <div className="input input-bordered flex items-center gap-2">
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
                    name="firstName"
                    value={formik.values.firstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                    placeholder="Last Name"
                  />
                </div>
              </div>
              <FieldError formik={formik} name="firstName" />

              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Last Name</span>
                </div>

                <label className="input input-bordered flex items-center gap-2">
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
                    name="lastName"
                    value={formik.values.lastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                    placeholder="Last Name"
                  />
                </label>
              </div>
              <FieldError formik={formik} name="lastName" />

              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">User Name</span>
                </div>

                <label className="input input-bordered flex items-center gap-2 text-gray-400">
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
                    className="grow"
                    placeholder="User Name"
                    readOnly
                  />
                </label>
              </div>
              <FieldError formik={formik} name="userName" />

              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Email</span>
                </div>

                <label className="input input-bordered flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                    placeholder="Email"
                  />
                </label>
              </div>
              <FieldError formik={formik} name="email" />

              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Mobile Phone</span>
                </div>

                <label className="input input-bordered flex items-center gap-2">
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
                    name="mobilePhone"
                    value={formik.values.mobilePhone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                    placeholder="Mobile Phone"
                  />
                </label>
              </div>
              <FieldError formik={formik} name="mobilePhone" />
            </div>

            <div className="border-2 flex-grow mt-5 h-[400px] overflow-y-auto">
              <div>
                <h3 className="text-center border-b-2">Available Roles</h3>
                {rolesList.map((role) => {
                  return (
                    <label className="label cursor-pointer" key={role.id}>
                      <input
                        id={role.id}
                        name={`role_${role.id}`}
                        value={formik.values.roles[role.id]}
                        onChange={formik.handleChange}
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        defaultChecked={checkIfUserHasRole(userDetails, role)}
                      />
                      <span className="label-text ml-2 mr-auto">
                        {role.roleName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="flex items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <FormStateError formState={formState} />
          </div>
          <div className="my-3 flex justify-around">
            <SubmitButton
              label="Update"
              loading="Updating ..."
              isValid={formik.isValid}
              isDirty={formik.dirty}
            />

            <CancelButton onClick={closeModal} />

            {noScriptFallback}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
