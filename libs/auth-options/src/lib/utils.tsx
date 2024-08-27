import { AppPermissionTypes } from '@b2b-tickets/shared-models';
import { AppRoleTypes } from '@b2b-tickets/shared-models';

export const userHasPermission = (session: any, permissionName: any) => {
  if (!session) return false;
  return session?.user?.permissions.some(
    (permission: any) =>
      permission.permissionName === permissionName ||
      permission.permissionName === AppPermissionTypes.API_Admin
  );
};

export const endPointPermitted = (session: any, endpoint: any) => {
  if (session?.user?.roles.includes(AppRoleTypes.Admin)) return true;

  return session?.user?.permissions.some((perm: any) =>
    perm.permissionEndPoint?.startsWith(endpoint)
  );
};
