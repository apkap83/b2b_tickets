'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWebSocketContext } from '@b2b-tickets/contexts';
import { refreshOnlineUsersStatus } from '@b2b-tickets/admin-server-actions';

import { UsersTab } from './Tabs/UsersTab/UsersTab';
import { RolesTab } from './Tabs/RolesTab/RolesTab';
import { PermissionsTab } from './Tabs/PermissionsTab/PermissionsTab';
import { CompanyTab } from './Tabs/CompanyTab/CompanyTab';

export const AdminDashboard = ({
  usersList: initialUsersList,
  rolesList,
  permissionsList,
}: any) => {
  const [activeTab, setActiveTab] = useState('Users');
  const [usersList, setUsersList] = useState(initialUsersList);
  const { connected } = useWebSocketContext();
  const [hasRefreshed, setHasRefreshed] = useState(false);

  // Refresh online status when socket connects (with delay to ensure presence is updated)
  useEffect(() => {
    if (connected && !hasRefreshed) {
      const refreshOnlineStatus = async () => {
        try {
          // Small delay to ensure presence is properly set in Redis
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const onlineStatusMap = await refreshOnlineUsersStatus();
          setUsersList((prevUsers: any[]) =>
            prevUsers.map((user: any) => {
              const userId = user.user_id.toString();
              const onlineStatus = onlineStatusMap[userId];
              return {
                ...user,
                isOnline: onlineStatus?.isOnline || false,
                lastSeen: onlineStatus?.lastSeen || user.lastSeen,
                connectedAt: onlineStatus?.connectedAt || user.connectedAt,
              };
            })
          );

          setHasRefreshed(true);
        } catch (error) {
          console.error('Failed to refresh online status:', error);
        }
      };

      refreshOnlineStatus();
    }
  }, [connected, hasRefreshed]);

  return (
    <>
      <div className="relative m-0 py-1 px-5 flex flex-col overflow-y-auto z-5">
        <div className="text-center text-4xl"></div>

        <div className="pt-5 flex flex-col flex-grow ">
          <h1 className="text-4xl font-thin text-left inline-block">
            <span className="text-black inline-block w-[300px] rounded-md tracking-wider text-left">
              Users List
            </span>
          </h1>
          <div className="my-3 border-b border-gray-200"></div>
          <div className="border-b">
            <div
              role="tablist"
              className="w-80 tabs tabs-lifted tabs-lg w-50 mb-[-1px]"
            >
              <a
                role="tab"
                className={`tab ${activeTab === 'Users' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('Users')}
              >
                Users
              </a>
              <a
                role="tab"
                className={`tab ${activeTab === 'Company' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('Company')}
              >
                Company
              </a>
              <a
                role="tab"
                className={`tab ${activeTab === 'Roles' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('Roles')}
              >
                Roles
              </a>
              <a
                role="tab"
                className={`tab ${
                  activeTab === 'Permissions' ? 'tab-active' : ''
                }`}
                onClick={() => setActiveTab('Permissions')}
              >
                Permissions
              </a>
            </div>
          </div>

          {activeTab === 'Users' && (
            <div className="mb-[2rem] ">
              <UsersTab usersList={usersList} rolesList={rolesList} />
            </div>
          )}

          {activeTab === 'Company' && (
            <div className="mb-[2rem] ">
              <CompanyTab usersList={usersList} rolesList={rolesList} />
            </div>
          )}

          {activeTab === 'Roles' && (
            <div className="mb-[2rem] ">
              <RolesTab
                rolesList={rolesList}
                permissionsList={permissionsList}
              />
            </div>
          )}

          {activeTab === 'Permissions' && (
            <div className="mb-[2rem]">
              <PermissionsTab permissionsList={permissionsList} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
