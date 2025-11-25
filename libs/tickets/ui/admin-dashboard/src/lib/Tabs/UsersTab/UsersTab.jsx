import React, { useState, useRef, useEffect } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { PaginationOld } from '@b2b-tickets/ui';
import slice from 'lodash/slice';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';

import CreateUserModal from '../../Modals/CreateUser/CreateUserModal';
import DeleteUserModal from '../../Modals/DeleteUser/DeleteUserModal';
import EditUserModal from '../../Modals/EditUser/EditUserModal';
import { PasswordResetModal } from '../../Modals/PasswordReset/PasswordResetModal';

import { PasswordChangeButton } from './Buttons/PasswordChangeButton';
import { EditButton } from './Buttons/EditButton';
import { DeleteButton } from './Buttons/DeleteButton';
import { LockOrUnlock } from './Buttons/LockUnlockButton';
import { DisableUser } from './Buttons/DisableUser';

import clsx from 'clsx';
import { updateMFAMethodForUser } from '@b2b-tickets/admin-server-actions';
import styles from './css/UsersTab.module.scss';
import config from '@b2b-tickets/config';
import toast from 'react-hot-toast';
import {
  convertTo24HourFormat,
  convertToLocalTime,
  getUserIdentifier,
} from '@b2b-tickets/utils';

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

  // In your component:
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 90);
        console.log('rect.top', rect.top);
      }
    };

    // Listen to ALL scroll events (captures any scrollable element)
    document.addEventListener('scroll', handleScroll, true); // true = capture phase
    handleScroll();

    return () => document.removeEventListener('scroll', handleScroll, true);
  }, []);

  const itemsPerPage = 15000;

  const paginatedUsersList = slice(
    usersList,
    (activePage - 1) * itemsPerPage,
    (activePage - 1) * itemsPerPage + itemsPerPage
  );

  const getDuplicateEmailCount = (email) => {
    return paginatedUsersList.filter((item) => item.email === email).length;
  };

  return (
    <>
      <div style={{ marginTop: '-50px' }}>
        <div className="float-right py-5 flex gap-1 items-center justify-end -translate-y-[16px]">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowCreateUserModal(true);
            }}
          >
            Create New User
          </button>
        </div>
        <div>
          <table className={`${styles.myTable} table text-xs`}>
            <thead className="">
              <tr
                ref={headerRef}
                className={`sticky top-[70px] z-5 bg-white`}
                style={isSticky ? { backgroundColor: '#fbfbfb' } : {}}
              >
                <th></th>
                <th className="text-center">First Name</th>
                <th className="text-center">Last Name</th>
                <th className="text-center">User Name</th>
                <th className="text-center">E-mail</th>
                <th className="text-center">Mobile Phone</th>
                <th className="text-center">Customer</th>
                <th className="text-center">Roles</th>
                <th className="text-center">MFA Method</th>
                <th className="text-center">
                  Last
                  <br />
                  Login
                  <br />
                  Attempt
                </th>
                <th className="text-center">
                  Failed
                  <br />
                  Login
                  <br />
                  Attempts
                </th>
                <th className="text-center">Status</th>
                <th className="text-center">Locked</th>
                <th className="text-center">Active</th>
                <th className="w-[150px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsersList.map((user, index) => (
                <tr
                  key={user.username + index}
                  className="text-center hover:bg-slate-100"
                >
                  <th>
                    <span className="p-1">
                      {index + 1 + itemsPerPage * (activePage - 1)}
                    </span>
                  </th>
                  <td>{user.first_name}</td>
                  <td>{user.last_name}</td>
                  <td className="text-wrap" style={{ maxWidth: '150px' }}>
                    <span style={{ wordBreak: 'break-all' }}>
                      {getUserIdentifier(user.username, user.email)}
                      &nbsp;
                    </span>{' '}
                  </td>

                  <td /*className="text-wrap" style={{ maxWidth: '150px' }}*/>
                    <span style={{ wordBreak: 'break-all' }}>{user.email}</span>
                    <br />
                    {getDuplicateEmailCount(user.email) > 1 && (
                      <span className="inline-block rounded-full bg-green-500 text-white px-2 py-1 mt-1">
                        {getDuplicateEmailCount(user.email)} accounts
                      </span>
                    )}
                    <br />
                  </td>

                  <td className="text-wrap" style={{ maxWidth: '150px' }}>
                    <span style={{ wordBreak: 'break-all' }}>
                      {user.mobile_phone}
                    </span>
                  </td>
                  <td className="text-center whitespace-wrap">
                    {user.customer_name}
                  </td>
                  <td>
                    {user.AppRoles.map((role) => {
                      return (
                        <span
                          className={clsx(
                            'bg-black/10 whitespace-nowrap rounded-full text-xs px-2 inline-block m-1 font-bold text-i ',
                            {
                              'text-red-500': role.roleName === 'Admin',
                              'text-blue-500':
                                role.roleName === 'B2B Ticket Creator',
                              'text-purple-500': role.roleName === 'Other',
                              'text-green-600':
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
                    <select
                      className="text-left select max-w-xs"
                      onChange={async (e) => {
                        const resp = await updateMFAMethodForUser({
                          username: user.username,
                          mfaType: e.target.value,
                        });

                        if (resp.status === 'SUCCESS') {
                          toast.success(resp.message);
                        } else {
                          toast.error(resp.message);
                        }
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                      defaultValue={user.mfa_method}
                    >
                      <option value={'m'}>Mobile</option>
                      <option value={'e'}>Email</option>
                      {/* <option value={'LDAP'}>LDAP</option> */}
                    </select>
                  </td>
                  <td className="text-center">
                    {convertTo24HourFormat(user.last_login_attempt)}
                  </td>
                  <td className="text-center">
                    {user.last_login_failed_attempts}
                  </td>
                  <td>
                    {user.isOnline ? (
                      <div
                        className={`bg-green-100 flex flex-col items-center px-2 py-1 text-xs font-semibold rounded-lg`}
                      >
                        <span>🟢&nbsp;Online</span>
                      </div>
                    ) : (
                      <span>⚫&nbsp;Offline</span>
                    )}
                  </td>
                  <td style={{ padding: '5px' }}>
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
                  <td style={{ padding: '5px' }}>
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
                  <td style={{ padding: '5px' }}>
                    <div className="flex  shadow-sm py-2 px-2 gap-3 w-fit">
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
      </div>
      <div className="px-5 pt-2 flex justify-between items-center">
        <div className="py-5 flex gap-1 ">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowCreateUserModal(true);
            }}
          >
            Create New User
          </button>
        </div>
        <PaginationOld
          totalItems={usersList?.length || 0}
          pageSize={itemsPerPage}
          activePage={activePage}
          onPageChange={(page) => setActivePage(page)}
        />
      </div>

      {showCreateUserModal && (
        <CreateUserModal
          rolesList={rolesList}
          closeModal={() => setShowCreateUserModal(false)}
        />
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
