import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';
import { redirect } from 'next/navigation';

import { AdminDashboard } from '@b2b-tickets/tickets/ui';
import { getAdminDashboardData } from '@b2b-tickets/admin-server-actions';

const AdminPage = async () => {
  // const session = await getServerSession(options);
  // if (!session) {
  //   redirect("/api/auth/signin?callbackUrl=/Admin");
  // }

  // console.log("session", session);
  const { usersList, rolesList, permissionsList } =
    await getAdminDashboardData();

  // console.log('usersList', usersList);
  return (
    <AdminDashboard
      usersList={usersList}
      rolesList={rolesList}
      permissionsList={permissionsList}
    />
  );
};

export default AdminPage;
