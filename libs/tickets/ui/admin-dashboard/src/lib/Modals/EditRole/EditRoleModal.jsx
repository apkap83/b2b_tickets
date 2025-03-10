import React, { useEffect } from 'react';
import * as Yup from 'yup';
import { useFormState } from 'react-dom';
import { useFormik } from 'formik';
import { FieldError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { useToastMessage } from '@b2b-tickets/react-hooks';
import { EMPTY_FORM_STATE } from '@b2b-tickets/utils';
import { SubmitButton } from '../../common/SubmitButton';
import { editRole } from '@b2b-tickets/admin-server-actions';
import { FormStateError } from '@b2b-tickets/tickets/ui/admin-dashboard';
import { FaMobileRetro } from 'react-icons/fa6';

const validationSchema = Yup.object({
  roleName: Yup.string().required('Role name is required'),
  description: Yup.string().required('Role description is required'),
});

const EditRoleModal = ({ roleDetails, permissionsList, closeModal }) => {
  const [formState, action] = useFormState(editRole, EMPTY_FORM_STATE);

  const noScriptFallback = useToastMessage(formState);

  const checkIfRoleHasPermission = (role, permission) => {
    if (!role.hasOwnProperty('AppPermissions')) return false;

    for (let i = 0; i < role.AppPermissions.length; i++) {
      if (permission.id === roleDetails.AppPermissions[i].id) {
        return true;
      }
    }
    return false;
  };

  const formik = useFormik({
    initialValues: {
      roleId: roleDetails.id,
      roleName: roleDetails.roleName,
      description: roleDetails.description,
      permissions: {},
    },
    validationSchema: validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {},
  });

  useEffect(() => {
    if (formState.status === 'SUCCESS') closeModal();
  }, [formState.status, formState.timestamp]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-[900px] h-[650px] px-8 py-4 border-[1px] border-blue-900 shadow-2xl rounded-lg">
        <h3 className="font-bold text-lg text-center">Edit Role Form</h3>

        <form className="flex flex-col gap-1 pt-3" action={action}>
          <div className="flex gap-4">
            <div className="w-1/3">
              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Role Name</span>
                </div>

                <input
                  type="hidden"
                  name="roleId"
                  value={formik.values.roleId}
                />

                <div className="input input-bordered flex items-center gap-2 text-gray-400">
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
                    readOnly
                  />
                </div>
              </div>
              <FieldError formik={formik} name="roleName" />

              <div className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Role Description</span>
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
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="grow"
                    placeholder="Role Description"
                  />
                </label>
              </div>
              <FieldError formik={formik} name="description" />
            </div>

            <div className="border-2 flex-grow mt-5 h-[450px] overflow-y-auto">
              <div>
                <h3 className="text-center border-b-2">
                  Available Permissions
                </h3>
                <table className="w-full">
                  <thead>
                    <th className="text-center w-1/2 border-r border-b-2">
                      Name
                    </th>
                    <th className="text-center border-r border-b-2">
                      End Point
                    </th>
                    <th className="text-center border-b-2 pl-1">Description</th>
                  </thead>
                  <tbody>
                    {permissionsList.map((permission) => {
                      return (
                        <>
                          <tr key={permission.id}>
                            <td className="border-r border-b text-xs">
                              <label
                                className="label cursor-pointer "
                                key={permission.id}
                              >
                                <input
                                  id={permission.id}
                                  name={`permission_${permission.id}`}
                                  value={
                                    formik.values.permissions[permission.id]
                                  }
                                  onChange={formik.handleChange}
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  defaultChecked={checkIfRoleHasPermission(
                                    roleDetails,
                                    permission
                                  )}
                                />
                                <span className="label-text ml-2 mr-auto text-xs">
                                  <td>{permission.permissionName}</td>
                                </span>
                              </label>
                            </td>
                            <td className="border-r border-b text-xs">
                              {permission.endPoint}
                            </td>
                            <td className=" border-b text-center text-xs">
                              {permission.description}
                            </td>
                          </tr>
                        </>
                      );
                    })}
                  </tbody>
                </table>
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
          <div className="mt-5 flex justify-around">
            <SubmitButton
              label="Update"
              loading="Updating ..."
              isValid={formik.isValid}
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

export default EditRoleModal;
