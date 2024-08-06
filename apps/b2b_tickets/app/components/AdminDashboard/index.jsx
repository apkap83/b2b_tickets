"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

import { UsersTab } from "./Tabs/UsersTab/UsersTab";
import { RolesTab } from "./Tabs/RolesTab/RolesTab";
import { PermissionsTab } from "./Tabs/PermissionsTab/PermissionsTab";

const AdminDashboard = ({ usersList, rolesList, permissionsList }) => {
  const [activeTab, setActiveTab] = useState("Users");

  return (
    <div className="m-0 p-5 flex flex-col bg-gray-50 h-[850px]">
      <div className="text-center text-4xl"></div>

      <div className="pt-5 flex flex-col flex-grow">
        <div className="border-b">
          <div
            role="tablist"
            className="w-80 tabs tabs-lifted tabs-lg w-50 mb-[-1px]"
          >
            <a
              role="tab"
              className={`tab ${activeTab === "Users" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("Users")}
            >
              Users
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === "Roles" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("Roles")}
            >
              Roles
            </a>
            <a
              role="tab"
              className={`tab ${
                activeTab === "Permissions" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("Permissions")}
            >
              Permissions
            </a>
          </div>
        </div>

        {activeTab === "Users" && (
          <UsersTab usersList={usersList} rolesList={rolesList} />
        )}

        {activeTab === "Roles" && (
          <RolesTab rolesList={rolesList} permissionsList={permissionsList} />
        )}

        {activeTab === "Permissions" && (
          <PermissionsTab permissionsList={permissionsList} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
