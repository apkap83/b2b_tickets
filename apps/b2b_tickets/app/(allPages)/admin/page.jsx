import { getServerSession } from "next-auth";
import { options } from "@/NMS_Portal_app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";

import AdminDashboard from "@/NMS_Portal_app/(components)/AdminDashboard";
import { getAdminDashboardData } from "@/NMS_Portal_app/lib/actions";

const AdminPage = async () => {
  // const session = await getServerSession(options);
  // if (!session) {
  //   redirect("/api/auth/signin?callbackUrl=/Admin");
  // }

  // console.log("session", session);
  const { usersList, rolesList, permissionsList } =
    await getAdminDashboardData();

  return (
    <AdminDashboard
      usersList={usersList}
      rolesList={rolesList}
      permissionsList={permissionsList}
    />
  );
};

export default AdminPage;
