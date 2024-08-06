import React, { useState } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import Pagination from '@/CommonLibraries/ui/Pagination';
import { renderActiveness } from '@/NMS_Portal_app/utils/help_func';
import slice from 'lodash/slice';
import { AuthenticationTypes } from '@/CommonLibraries/definitions';

import CreateUserModal from '../../Modals/CreateUser/CreateUserModal';
import DeleteUserModal from '../../Modals/DeleteUser/DeleteUserModal';
import EditUserModal from '../../Modals/EditUser/EditUserModal';
import PasswordResetModal from '../../Modals/PasswordReset/PasswordResetModal';

import { PasswordChangeButton } from './Buttons/PasswordChangeButton';
import { EditButton } from './Buttons/EditButton';
import { DeleteButton } from './Buttons/DeleteButton';
import { LockOrUnlock } from './Buttons/LockUnlockButton';
import clsx from 'clsx';
import { updateAuthMethodForUser } from '@/NMS_Portal_app/lib/actions';

const userDetailsInitalState = {
  firstName: null,
  lastName: null,
  userName: null,
  email: null,
  mobilePhone: null,
  roles: null,
};

export function UsersTab({ usersList, rolesList }) {
  const [activePage, setActivePage] = useState(1);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState({
    visible: false,
    userDetails: userDetailsInitalState,
  });
  const [showEditUserModal, setShowEditUserModal] = useState({
    visible: false,
    userDetails: userDetailsInitalState,
  });
  const [showDeleteUserModal, setShowDeleteUserModal] = useState({
    visible: false,
    userDetails: userDetailsInitalState,
  });

  const itemsPerPage = 10;

  const paginatedUsersList = slice(
    usersList,
    (activePage - 1) * itemsPerPage,
    (activePage - 1) * itemsPerPage + itemsPerPage
  );

  return (
    <>
      <div className='border-b h-[623px] overflow-y-auto'>
        <table className='table border-b'>
          <thead>
            <tr>
              <th></th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>User Name</th>
              <th>E-mail</th>
              <th>Mobile Phone</th>
              <th className='text-center w-[350px]'>Roles</th>
              <th>Auth</th>
              <th>State</th>
              <th className='w-[150px] text-center'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsersList.map((user, index) => (
              <tr key={user.userName + index} className='hover:bg-slate-100'>
                <th>{index + 1 + itemsPerPage * (activePage - 1)}</th>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.userName}</td>
                <td>{user.email}</td>
                <td>{user.mobilePhone}</td>
                <td>
                  {user.AppRoles.map((role) => {
                    return (
                      <span
                        className={clsx(
                          'bg-gray-200 rounded-full text-sm px-2 inline-block m-1 font-bold text-i ',
                          {
                            'text-red-500': role.roleName === 'Admin',
                            'text-blue-500': role.roleName === 'NMS_Member',
                            'text-purple-500': role.roleName === 'CX_PM',
                            'text-green-500': role.roleName === 'IP Operations',
                            'text-cyan-500': role.roleName === 'Smartcare',
                            'text-yellow-500': role.roleName === 'Zabbix',
                          }
                        )}
                        key={role.id}
                      >
                        {role.roleName}
                      </span>
                    );
                  })}
                </td>
                <td>
                  {/*{user.authenticationType}*/}
                  <select
                    className='text-left select max-w-xs'
                    onChange={(e) =>
                      updateAuthMethodForUser({
                        user,
                        authType: e.target.value,
                      })
                    }
                    style={{
                      backgroundColor: 'transparent',
                    }}
                    defaultValue={user.authenticationType}
                  >
                    <option value={'LOCAL'}>LOCAL</option>
                    <option value={'LDAP'}>LDAP</option>
                  </select>
                </td>
                <td>{renderActiveness(user.active)}</td>
                <td>
                  <div className='flex bg-purple-50 shadow-xl py-2 px-2 gap-3 w-fit'>
                    {LockOrUnlock({ user })}
                    {EditButton({ user, setShowEditUserModal })}
                    {user.authenticationType === AuthenticationTypes.LOCAL
                      ? PasswordChangeButton({
                          user,
                          setShowPasswordResetModal,
                        })
                      : null}
                    {DeleteButton({ user, setShowDeleteUserModal })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot></tfoot>
        </table>
      </div>
      <div className='pt-5 flex justify-between items-center'>
        <div className='py-5 flex gap-1 '>
          <button
            className='btn btn-primary btn-sm'
            onClick={() => {
              setShowCreateUserModal(true);
            }}
          >
            Create User
          </button>
        </div>
        <Pagination
          totalItems={usersList?.length || 0}
          pageSize={itemsPerPage}
          activePage={activePage}
          onPageChange={(page) => setActivePage(page)}
        />
      </div>

      {showCreateUserModal && (
        <CreateUserModal closeModal={() => setShowCreateUserModal(false)} />
      )}

      {showDeleteUserModal.visible && (
        <DeleteUserModal
          userDetails={showDeleteUserModal.userDetails}
          closeModal={() => setShowDeleteUserModal({ visible: false })}
        />
      )}

      {showEditUserModal.visible && (
        <EditUserModal
          userDetails={showEditUserModal.userDetails}
          rolesList={rolesList}
          closeModal={() => setShowEditUserModal({ visible: false })}
        />
      )}

      {showPasswordResetModal.visible && (
        <PasswordResetModal
          userDetails={showPasswordResetModal.userDetails}
          closeModal={() => setShowPasswordResetModal({ visible: false })}
        />
      )}

      <ReactTooltip id='editIcon' place='bottom' content='Edit User' />
      <ReactTooltip id='deleteIcon' place='bottom' content='Delete User' />
      <ReactTooltip id='lockIcon' place='bottom' content='Lock/Unlock User' />
      <ReactTooltip
        id='passwordChangeIcon'
        place='bottom'
        content='Password reset'
      />
    </>
  );
}
