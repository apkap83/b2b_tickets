import React, { useEffect } from "react";
import { useFormState } from "react-dom";
import { createPermission } from "@/NMS_Portal_app/lib/actions";
import { EMPTY_FORM_STATE } from "@/NMS_Portal_app/utils/to-form-state";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useToastMessage } from "@/NMS_Portal_app/(hooks)/use-toast-message";
import { FieldError } from "@/NMS_Portal_app/(components)/common/field-error";
import { FormStateError } from "@/NMS_Portal_app/(components)/common/form-state-error";
import { SubmitButton } from "@/NMS_Portal_app/(components)/ui/SubmitButton";

const CreatePermissionModal = ({ closeModal }) => {
  const [formState, action] = useFormState(createPermission, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);

  const formik = useFormik({
    initialValues: {
      permissionName: "",
      endPoint: "",
      permissionDescription: "",
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === "SUCCESS") closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white px-8 py-3 rounded-lg">
        <h3 className="font-bold text-lg text-center">
          Create Permission Form
        </h3>

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
              name="permissionName"
              value={formik.values.permissionName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Permission Name"
            />
          </label>
          <FieldError formik={formik} name="permissionName" />

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
              name="endPoint"
              value={formik.values.endPoint}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="End Point (optional)"
            />
          </label>
          <FieldError formik={formik} name="endPoint" />

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
              name="permissionDescription"
              value={formik.values.permissionDescription}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="grow"
              placeholder="Permission Description"
            />
          </label>
          <FieldError formik={formik} name="permissionDescription" />

          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <FormStateError formState={formState} />
          </div>
          <div className="mt-5 flex justify-around gap-4">
            <SubmitButton
              label="Create Permission"
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
  permissionName: Yup.string().required("Permission name is required"),
  permissionDescription: Yup.string().required(
    "Permission description is required"
  ),
});

export default CreatePermissionModal;
