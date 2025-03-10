import React, { useState } from 'react';
import CreatePermissionModal from '../../Modals/CreatePermission/CreatePermissionModal';
import DeletePermissionModal from '../../Modals/DeletePermission/DeletePermissionModal';
import { DeleteButton } from './Buttons/DeleteButton';

export const PermissionsTab = ({ permissionsList }) => {
  const [showCreatePermissionModal, setShowCreatePermissionModal] = useState({
    visible: false,
  });

  const [showDeletePermissionModal, setShowDeletePermissionModal] = useState({
    visible: false,
    permission: {
      permissionName: '',
      permissionDescription: '',
    },
  });

  return (
    <div style={{ marginTop: '-50px' }}>
      <div className="w-[8%] float-right py-5 flex gap-1 items-center justify-end -translate-y-[16px]">
        <button
          className="btn btn-sm  bg-black text-white hover:bg-gray-700"
          onClick={() => {
            setShowCreatePermissionModal({ visible: true });
          }}
        >
          Create New Permission
        </button>
      </div>
      <table className="table table-s">
        <thead>
          <tr>
            <th></th>
            <th>Permission Name</th>
            <th>End Point</th>
            <th>Description</th>
            <th className="w-[150px] text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {permissionsList.map((permission, index) => (
            <tr key={index + permission}>
              <th>{index + 1}</th>
              <td>{permission.permissionName}</td>
              <td>{permission.endPoint}</td>
              <td>{permission.description}</td>
              <td>
                <DeleteButton
                  permission={permission}
                  setShowDeletePermissionModal={setShowDeletePermissionModal}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot></tfoot>
      </table>

      <div className="pt-5 flex justify-between items-center"></div>

      {showDeletePermissionModal.visible && (
        <DeletePermissionModal
          permission={showDeletePermissionModal.permission}
          closeModal={() => setShowDeletePermissionModal({ visible: false })}
        />
      )}

      {showCreatePermissionModal.visible && (
        <CreatePermissionModal
          closeModal={() => setShowCreatePermissionModal({ visible: false })}
        />
      )}
    </div>
  );
};
