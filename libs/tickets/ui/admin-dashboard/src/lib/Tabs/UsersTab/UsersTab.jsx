import React, { useState } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { Pagination } from '@b2b-tickets/ui';
import { renderActiveness } from '@b2b-tickets/ui';
import slice from 'lodash/slice';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';

import CreateUserModal from '../../Modals/CreateUser/CreateUserModal';
import DeleteUserModal from '../../Modals/DeleteUser/DeleteUserModal';
import EditUserModal from '../../Modals/EditUser/EditUserModal';
import PasswordResetModal from '../../Modals/PasswordReset/PasswordResetModal';

import { PasswordChangeButton } from './Buttons/PasswordChangeButton';
import { EditButton } from './Buttons/EditButton';
import { DeleteButton } from './Buttons/DeleteButton';
import { LockOrUnlock } from './Buttons/LockUnlockButton';
import { DisableUser } from './Buttons/DisableUser';

import clsx from 'clsx';
import { updateAuthMethodForUser } from '@b2b-tickets/admin-server-actions';
import styles from './css/UsersTab.module.scss';

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
      <div className="border-b overflow-y-auto">
        <table className={`${styles.myTable} table border-b`}>
          <thead>
            <tr>
              <th></th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>User Name</th>
              <th>E-mail</th>
              <th>Mobile Phone</th>
              <th>Customer</th>
              <th className="text-center">Roles</th>
              <th>Auth</th>
              <th>Locked</th>
              <th>Active</th>
              <th className="w-[150px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsersList.map((user, index) => (
              <tr key={user.username + index} className="hover:bg-slate-100">
                <th>{index + 1 + itemsPerPage * (activePage - 1)}</th>
                <td>{user.first_name}</td>
                <td>{user.last_name}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.mobile_phone}</td>
                <td>
                  <span className="whitespace-nowrap">
                    {user.customer_name}
                  </span>
                </td>
                <td>
                  {user.AppRoles.map((role) => {
                    return (
                      <span
                        className={clsx(
                          'bg-gray-200 whitespace-nowrap rounded-full text-xs px-2 inline-block m-1 font-bold text-i ',
                          {
                            'text-red-500': role.roleName === 'Admin',
                            'text-blue-500':
                              role.roleName === 'B2B Ticket Creator',
                            'text-purple-500': role.roleName === 'Other',
                            'text-green-500':
                              role.roleName === 'B2B Ticket Handler',
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
                    className="text-left select max-w-xs"
                    onChange={(e) =>
                      // updateAuthMethodForUser({
                      //   user,
                      //   authType: e.target.value,
                      // })
                      pass
                    }
                    style={{
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                    defaultValue={user.authentication_type}
                  >
                    <option value={'LOCAL'}>LOCAL</option>
                    {/* <option value={'LDAP'}>LDAP</option> */}
                  </select>
                </td>
                <td>
                  {user.is_locked === 'y' ? (
                    <span className="bg-red-400 p-2 rounded-full text-white">
                      Locked
                    </span>
                  ) : (
                    <span className="bg-green-400 p-2 rounded-lg text-white">
                      Unlocked
                    </span>
                  )}
                </td>
                <td>
                  {user.is_active === 'y' ? (
                    <span className="bg-green-400 p-2 rounded-lg text-white">
                      Active
                    </span>
                  ) : (
                    <span className="bg-red-400 p-2 rounded-full text-white">
                      Inactive
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex bg-purple-50 shadow-xl py-2 px-2 gap-3 w-fit">
                    {LockOrUnlock({ user })}
                    {DisableUser({ user })}
                    {EditButton({ user, setShowEditUserModal })}
                    {user.authentication_type === AuthenticationTypes.LOCAL
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
      <div className="pt-5 flex justify-between items-center">
        <div className="py-5 flex gap-1 ">
          <button
            className="btn btn-primary btn-sm"
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

      <ReactTooltip id="editIcon" place="bottom" content="Edit User" />
      <ReactTooltip id="deleteIcon" place="bottom" content="Delete User" />
      <ReactTooltip id="lockIcon" place="bottom" content="Lock/Unlock User" />
      <ReactTooltip
        id="disableIcon"
        place="bottom"
        content="Disable/Enable User"
      />
      <ReactTooltip
        id="passwordChangeIcon"
        place="bottom"
        content="Password reset"
      />
    </>
  );
}
