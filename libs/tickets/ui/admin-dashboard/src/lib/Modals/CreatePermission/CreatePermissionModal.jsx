import React, { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { createPermission } from '@b2b-tickets/admin-server-actions';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { SubmitButton } from '../../common/SubmitButton';

import styles from './CreatePermissionModal.module.scss';

const CreatePermissionModal = ({ closeModal }) => {
  const [formState, action] = useFormState(createPermission, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);

  const formik = useFormik({
    initialValues: {
      permissionName: '',
      endPoint: '',
      permissionDescription: '',
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white px-8 py-5 rounded-lg">
        <h3 className="font-bold text-lg text-center">
          Create Permission Form
        </h3>

        <form
          className="flex flex-col gap-3 pt-3"
          // onSubmit={formik.handleSubmit}
          action={action}
          // ref={formRef}
        >
          <div>
            <span className={styles.inputDescription}>Permission Name</span>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                name="permissionName"
                value={formik.values.permissionName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
              />
            </label>
          </div>
          <FieldError formik={formik} name="permissionName" />

          <div>
            <span className={styles.inputDescription}>
              End Point (optional)
            </span>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                name="endPoint"
                value={formik.values.endPoint}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
              />
            </label>
          </div>
          <FieldError formik={formik} name="endPoint" />

          <div>
            <span className={styles.inputDescription}>
              Permission Description
            </span>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                name="permissionDescription"
                value={formik.values.permissionDescription}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
              />
            </label>
          </div>
          <FieldError formik={formik} name="permissionDescription" />

          <FormStateError formState={formState} />
          <div className="mt-5 flex justify-around gap-4">
            <SubmitButton
              label="Create Permission"
              loading="Creating ..."
              isValid={formik.dirty && formik.isValid}
              isDirty={formik.dirty}
            />

            <button className="btn btn-sm" onClick={closeModal}>
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
  permissionName: Yup.string().required('Permission name is required'),
  permissionDescription: Yup.string().required(
    'Permission description is required'
  ),
});

export default CreatePermissionModal;
