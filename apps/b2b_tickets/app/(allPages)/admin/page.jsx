// Convert the route to be dynamically rendered by opting out of static generation.
export const dynamic = 'force-dynamic';

import { AdminDashboard } from '@b2b-tickets/tickets/ui';
import { getAdminDashboardData } from '@b2b-tickets/admin-server-actions';

const AdminPage = async () => {
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
