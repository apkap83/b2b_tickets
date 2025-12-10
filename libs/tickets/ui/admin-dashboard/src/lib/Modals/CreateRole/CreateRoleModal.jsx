import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { createRole } from '@b2b-tickets/admin-server-actions';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { SubmitButton } from '../../common/SubmitButton';
import { CancelButton } from '../../common/CancelButton';

import styles from './CreateRoleModal.module.scss';

const CreateRoleModal = ({ closeModal }) => {
  const [formState, action] = useActionState(createRole, EMPTY_FORM_STATE);

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
      <div className="bg-white px-8 py-5 rounded-lg">
        <h3 className="font-bold text-lg text-center">Create Role Form</h3>

        <form
          className="flex flex-col gap-3 pt-3"
          // onSubmit={formik.handleSubmit}
          action={action}
          // ref={formRef}
        >
          <div>
            <span className={styles.inputDescription}>Role Name</span>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                name="roleName"
                value={formik.values.roleName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
              />
            </label>
          </div>
          <FieldError formik={formik} name="roleName" />

          <div>
            <span className={styles.inputDescription}>Role Description</span>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                name="roleDescription"
                value={formik.values.roleDescription}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="grow"
              />
            </label>
          </div>
          <FieldError formik={formik} name="roleDescription" />

          <FormStateError formState={formState} />
          <div className="mt-5 flex justify-around">
            <SubmitButton
              label="Create Role"
              loading="Creating ..."
              isValid={formik.dirty && formik.isValid}
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

const validationSchema = Yup.object({
  roleName: Yup.string().required('Role name is required'),
  roleDescription: Yup.string().required('Role description is required'),
});

export default CreateRoleModal;
