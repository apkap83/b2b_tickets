import React from "react";

const Denied = () => {
  return (
    <div className="flex flex-col justify-center items-center h-[500px]">
      <h1 className="text-black-500">Access Denied</h1>
      <p>You do not have permissions to access this page</p>
      <p className="pt-10">Please contact your system administrator</p>
    </div>
  );
};

export default Denied;
