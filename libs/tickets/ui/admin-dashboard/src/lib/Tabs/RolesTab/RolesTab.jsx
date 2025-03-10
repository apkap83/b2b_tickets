'use client';
import React, { useState } from 'react';
import { DeleteButton } from './Buttons/DeleteButton';
import CreateRoleModal from '../../Modals/CreateRole/CreateRoleModal';
import DeleteRoleModal from '../../Modals/DeleteRole/DeleteRoleModal';
import EditRoleModal from '../../Modals/EditRole/EditRoleModal';

import { EditButton } from './Buttons/EditButton';

export const RolesTab = ({ rolesList, permissionsList }) => {
  const [showCreateRoleModal, setShowCreateRoleModal] = useState({
    visible: false,
  });

  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState({
    visible: false,
    role: {
      roleName: '',
      roleDescription: '',
    },
  });

  const [showEditRoleModal, setShowEditRoleModal] = useState({
    visible: false,
    role: {},
  });

  return (
    // <div>
    <>
      <div
        className="w-[8%] float-right py-5 flex gap-1 items-center justify-end -translate-y-[16px]"
        style={{ marginTop: '-50px' }}
      >
        <button
          className="btn btn-sm bg-black text-white hover:bg-gray-700"
          onClick={() => {
            setShowCreateRoleModal({ visible: true });
          }}
        >
          Create New Role
        </button>
      </div>
      <table className="table table-s">
        <thead>
          <tr>
            <th></th>
            <th>Role Name</th>
            <th>Description</th>
            <th>Permissions</th>
            <th className="w-[150px] text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rolesList.map((role, index) => (
            <tr className="border-b-gray-500" key={index + role}>
              <th>{index + 1}</th>
              <td>{role.roleName}</td>
              <td>{role.description}</td>
              <td>
                {role.AppPermissions.length !== 0 ? (
                  <table className="bg-gray-100 text-xs">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {role.AppPermissions.map((p, id) => (
                        <tr key={id}>
                          <td>{p.permissionName}</td>
                          <td>{p.endPoint}</td>
                          <td>{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span className="text-gray-400">No Permissions</span>
                )}
              </td>
              <td>
                <div className="flex bg-purple-50 shadow-xl py-2 px-2 gap-3 w-fit">
                  {EditButton({ role, setShowEditRoleModal })}
                  <DeleteButton
                    role={role}
                    setShowDeleteRoleModal={setShowDeleteRoleModal}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot></tfoot>
      </table>

      <div className="pt-5 flex justify-between items-center"></div>

      {showDeleteRoleModal.visible && (
        <DeleteRoleModal
          role={showDeleteRoleModal.role}
          closeModal={() => setShowDeleteRoleModal({ visible: false })}
        />
      )}

      {showCreateRoleModal.visible && (
        <CreateRoleModal
          closeModal={() => setShowCreateRoleModal({ visible: false })}
        />
      )}

      {showEditRoleModal.visible && (
        <EditRoleModal
          roleDetails={showEditRoleModal.role}
          permissionsList={permissionsList}
          closeModal={() => setShowEditRoleModal({ visible: false })}
        />
      )}
    </>
    // </div>
  );
};
