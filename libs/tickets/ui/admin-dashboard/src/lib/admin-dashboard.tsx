'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { UsersTab } from './Tabs/UsersTab/UsersTab';
import { RolesTab } from './Tabs/RolesTab/RolesTab';
import { PermissionsTab } from './Tabs/PermissionsTab/PermissionsTab';
import { CompanyTab } from './Tabs/CompanyTab/CompanyTab';

export const AdminDashboard = ({
  usersList,
  rolesList,
  permissionsList,
  userStats,
}: any) => {
  const [activeTab, setActiveTab] = useState('Users');
  const [showOnlineUsersTooltip, setShowOnlineUsersTooltip] = useState(false);

  function getMinutesSince(dateObject: Date): number {
    const now = new Date();

    // Both getTime() return UTC timestamps (milliseconds since epoch)
    // so the comparison is timezone-independent
    const diffInMilliseconds = now.getTime() - dateObject.getTime();
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

    return diffInMinutes;
  }

  const TotalUsersIndication = () => {
    return (
      <div
        className="relative flex-col gap-1 items-center border border-gray-200 text-gray-600 flex  px-2 py-1 text-xs font-semibold rounded-lg"
        onMouseEnter={() => setShowOnlineUsersTooltip(true)}
        onMouseLeave={() => setShowOnlineUsersTooltip(false)}
      >
        <span>Total Users: {userStats?.totalUsers}</span>
        <span className=" bg-green-100 px-2 py-1 text-xs font-semibold rounded-lg">
          🟢&nbsp;&nbsp;{userStats?.totalOnlineUsers} Online
        </span>
        {showOnlineUsersTooltip && <ShowOnlineUsersTooltip />}
      </div>
    );
  };
  const ShowOnlineUsersTooltip = () => {
    return (
      <div className="absolute top-[55px] right-0 text-black bg-gray-50 border border-gray-200 min-w-[140px] p-2 rounded-md z-10">
        <h3 className="text-center">Online Users</h3>
        <br />
        {usersList.map((user: any) => {
          if (user.isOnline) {
            return (
              <div
                key={user.id}
                className="flex justify-center gap-1 items-center"
              >
                <span className="flex justify-center items-center whitespace-nowrap">
                  <span className="text-[8px] flex justify-center items-center">
                    🟢
                  </span>
                  &nbsp;
                  {user.username} ({getMinutesSince(user.last_login_attempt)}
                  &nbsp;mins)
                </span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <>
      <div className="relative m-0 py-1 px-5 flex flex-col overflow-y-auto z-5">
        <div className="text-center text-4xl"></div>

        <div className="pt-5 flex flex-col flex-grow ">
          <div className="flex justify-between items-center after:font-thin text-left">
            <h1 className="text-4xl flex-1 text-black tracking-wider">
              Users List
            </h1>
            <TotalUsersIndication />
          </div>
          <div className="my-3 border-b border-gray-200"></div>
          <div className="border-b">
            <div
              role="tablist"
              className="w-[433px] tabs tabs-lifted tabs-lg w-50 mb-[-1px]"
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
