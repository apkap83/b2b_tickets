import React, { useTransition } from 'react';
import { toast } from 'react-hot-toast';
import { deletePermission } from '@b2b-tickets/admin-server-actions';
import { CancelButton } from '../../common/CancelButton';
import { ConfirmButton } from '../../common/ConfirmButton';

function DeletePermissionModal({ permission, closeModal }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white px-8 py-3 rounded-lg border-[1px] shadow-2xl border-red-900">
        <h3 className="mt-5 font-bold text-lg text-center">
          Confirmation - Delete Permission
        </h3>

        <div className="mt-3">
          <h4>
            Are you sure that you want to delete permission with the following
            details ?
          </h4>
          <ul
            className="flex flex-col list-none justify-center w-1/2 mt-5 ml-auto border p-2"
            style={{ transform: 'translateX(-50%)' }}
          >
            <li>Permission Name: {permission.permissionName}</li>
            <li>Permission Description: {permission.description}</li>
          </ul>
        </div>

        <div className="mt-5 mb-5 flex justify-around">
          <ConfirmButton
            className="text-red-400 shadow-md"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  const response = await deletePermission({
                    permission,
                  });

                  if (response.status === 'SUCCESS') {
                    toast.success(response.message);
                  } else {
                    toast.error(response.message);
                  }

                  closeModal();
                } catch (error) {
                  toast.error('An unexpected error occurred.');
                }
              });
            }}
            label={isPending ? 'Deleting...' : 'Confirm'}
          />

          <CancelButton onClick={closeModal} />
        </div>
      </div>
    </div>
  );
}

export default DeletePermissionModal;
