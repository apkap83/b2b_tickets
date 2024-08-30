import React, { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { createRole } from '@b2b-tickets/admin-server-actions';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { SubmitButton } from '../../common/SubmitButton';

const CreateRoleModal = ({ closeModal }) => {
  const [formState, action] = useFormState(createRole, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);

  const formik = useFormik({
    initialValues: {
      roleName: '',
      roleDescription: '',
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white px-8 py-3 rounded-lg">
        <h3 className="font-bold text-lg text-center">Create Role Form</h3>

        <form
          className="flex flex-col gap-3 pt-3"
          // onSubmit={formik.handleSubmit}
          action={action}
          // ref={formRef}
        >
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
              name="roleName"
              value={formik.values.roleName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Role Name"
            />
          </label>
          <FieldError formik={formik} name="roleName" />

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
              name="roleDescription"
              value={formik.values.roleDescription}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Role Description"
            />
          </label>
          <FieldError formik={formik} name="roleDescription" />

          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <FormStateError formState={formState} />
          </div>
          <div className="mt-5 flex justify-around">
            <SubmitButton
              label="Create Role"
              loading="Creating ..."
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
  );
};

const validationSchema = Yup.object({
  roleName: Yup.string().required('Role name is required'),
  roleDescription: Yup.string().required('Role description is required'),
});

export default CreateRoleModal;
