'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

import { UsersTab } from './Tabs/UsersTab/UsersTab';
import { RolesTab } from './Tabs/RolesTab/RolesTab';
import { PermissionsTab } from './Tabs/PermissionsTab/PermissionsTab';

export const AdminDashboard = ({
  usersList,
  rolesList,
  permissionsList,
}: any) => {
  const [activeTab, setActiveTab] = useState('Users');

  return (
    <>
      <div className="relative m-0 p-5 flex flex-col overflow-y-auto mb-[2.5rem] z-5">
        <div className="text-center text-4xl"></div>

        <div className="pt-5 flex flex-col flex-grow ">
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
            <div className="mb-[2rem]">
              <UsersTab usersList={usersList} rolesList={rolesList} />
            </div>
          )}

          {activeTab === 'Roles' && (
            // <div className="mb-[2rem]">
            <RolesTab rolesList={rolesList} permissionsList={permissionsList} />
            // </div>
          )}

          {activeTab === 'Permissions' && (
            // <div className="mb-[2rem]">
            <PermissionsTab permissionsList={permissionsList} />
            // </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
