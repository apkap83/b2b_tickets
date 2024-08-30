import type { Sequelize } from "sequelize";
import { AppPermission as _AppPermission } from "./AppPermission";
import type { AppPermissionAttributes, AppPermissionCreationAttributes } from "./AppPermission";
import { AppRole as _AppRole } from "./AppRole";
import type { AppRoleAttributes, AppRoleCreationAttributes } from "./AppRole";
import { AppUser as _AppUser } from "./AppUser";
import type { AppUserAttributes, AppUserCreationAttributes } from "./AppUser";
import { Audit as _Audit } from "./Audit";
import type { AuditAttributes, AuditCreationAttributes } from "./Audit";
import { _rolePermission as __rolePermission } from "./_rolePermission";
import type { _rolePermissionAttributes, _rolePermissionCreationAttributes } from "./_rolePermission";
import { _userRole as __userRole } from "./_userRole";
import type { _userRoleAttributes, _userRoleCreationAttributes } from "./_userRole";
import { customers as _customers } from "./customers";
import type { customersAttributes, customersCreationAttributes } from "./customers";
import { service_types as _service_types } from "./service_types";
import type { service_typesAttributes, service_typesCreationAttributes } from "./service_types";
import { statuses as _statuses } from "./statuses";
import type { statusesAttributes, statusesCreationAttributes } from "./statuses";
import { ticket_categories as _ticket_categories } from "./ticket_categories";
import type { ticket_categoriesAttributes, ticket_categoriesCreationAttributes } from "./ticket_categories";
import { ticket_comments as _ticket_comments } from "./ticket_comments";
import type { ticket_commentsAttributes, ticket_commentsCreationAttributes } from "./ticket_comments";
import { tickets as _tickets } from "./tickets";
import type { ticketsAttributes, ticketsCreationAttributes } from "./tickets";
import { users as _users } from "./users";
import type { usersAttributes, usersCreationAttributes } from "./users";

export {
  _AppPermission as AppPermission,
  _AppRole as AppRole,
  _AppUser as AppUser,
  _Audit as Audit,
  __rolePermission as _rolePermission,
  __userRole as _userRole,
  _customers as customers,
  _service_types as service_types,
  _statuses as statuses,
  _ticket_categories as ticket_categories,
  _ticket_comments as ticket_comments,
  _tickets as tickets,
  _users as users,
};

export type {
  AppPermissionAttributes,
  AppPermissionCreationAttributes,
  AppRoleAttributes,
  AppRoleCreationAttributes,
  AppUserAttributes,
  AppUserCreationAttributes,
  AuditAttributes,
  AuditCreationAttributes,
  _rolePermissionAttributes,
  _rolePermissionCreationAttributes,
  _userRoleAttributes,
  _userRoleCreationAttributes,
  customersAttributes,
  customersCreationAttributes,
  service_typesAttributes,
  service_typesCreationAttributes,
  statusesAttributes,
  statusesCreationAttributes,
  ticket_categoriesAttributes,
  ticket_categoriesCreationAttributes,
  ticket_commentsAttributes,
  ticket_commentsCreationAttributes,
  ticketsAttributes,
  ticketsCreationAttributes,
  usersAttributes,
  usersCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const AppPermission = _AppPermission.initModel(sequelize);
  const AppRole = _AppRole.initModel(sequelize);
  const AppUser = _AppUser.initModel(sequelize);
  const Audit = _Audit.initModel(sequelize);
  const _rolePermission = __rolePermission.initModel(sequelize);
  const _userRole = __userRole.initModel(sequelize);
  const customers = _customers.initModel(sequelize);
  const service_types = _service_types.initModel(sequelize);
  const statuses = _statuses.initModel(sequelize);
  const ticket_categories = _ticket_categories.initModel(sequelize);
  const ticket_comments = _ticket_comments.initModel(sequelize);
  const tickets = _tickets.initModel(sequelize);
  const users = _users.initModel(sequelize);

  AppPermission.belongsToMany(AppRole, { as: 'AppRoleId_AppRoles', through: _rolePermission, foreignKey: "AppPermissionId", otherKey: "AppRoleId" });
  AppRole.belongsToMany(AppPermission, { as: 'AppPermissionId_AppPermissions', through: _rolePermission, foreignKey: "AppRoleId", otherKey: "AppPermissionId" });
  AppRole.belongsToMany(AppUser, { as: 'AppUserId_AppUsers', through: _userRole, foreignKey: "AppRoleId", otherKey: "AppUserId" });
  AppUser.belongsToMany(AppRole, { as: 'AppRoleId_AppRole__userRoles', through: _userRole, foreignKey: "AppUserId", otherKey: "AppRoleId" });
  Audit.belongsTo(AppPermission, { as: "permission", foreignKey: "permissionId"});
  AppPermission.hasMany(Audit, { as: "Audits", foreignKey: "permissionId"});
  _rolePermission.belongsTo(AppPermission, { as: "AppPermission", foreignKey: "AppPermissionId"});
  AppPermission.hasMany(_rolePermission, { as: "_rolePermissions", foreignKey: "AppPermissionId"});
  Audit.belongsTo(AppRole, { as: "role", foreignKey: "roleId"});
  AppRole.hasMany(Audit, { as: "Audits", foreignKey: "roleId"});
  _rolePermission.belongsTo(AppRole, { as: "AppRole", foreignKey: "AppRoleId"});
  AppRole.hasMany(_rolePermission, { as: "_rolePermissions", foreignKey: "AppRoleId"});
  _userRole.belongsTo(AppRole, { as: "AppRole", foreignKey: "AppRoleId"});
  AppRole.hasMany(_userRole, { as: "_userRoles", foreignKey: "AppRoleId"});
  Audit.belongsTo(AppUser, { as: "user", foreignKey: "userId"});
  AppUser.hasMany(Audit, { as: "Audits", foreignKey: "userId"});
  _userRole.belongsTo(AppUser, { as: "AppUser", foreignKey: "AppUserId"});
  AppUser.hasMany(_userRole, { as: "_userRoles", foreignKey: "AppUserId"});
  ticket_categories.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(ticket_categories, { as: "ticket_categories", foreignKey: "customer_id"});
  tickets.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(tickets, { as: "tickets", foreignKey: "customer_id"});
  users.belongsTo(customers, { as: "customer", foreignKey: "customer_id"});
  customers.hasMany(users, { as: "users", foreignKey: "customer_id"});
  tickets.belongsTo(service_types, { as: "service", foreignKey: "service_id"});
  service_types.hasMany(tickets, { as: "tickets", foreignKey: "service_id"});
  tickets.belongsTo(statuses, { as: "status", foreignKey: "status_id"});
  statuses.hasMany(tickets, { as: "tickets", foreignKey: "status_id"});
  tickets.belongsTo(ticket_categories, { as: "category", foreignKey: "category_id"});
  ticket_categories.hasMany(tickets, { as: "tickets", foreignKey: "category_id"});
  ticket_comments.belongsTo(tickets, { as: "ticket", foreignKey: "ticket_id"});
  tickets.hasMany(ticket_comments, { as: "ticket_comments", foreignKey: "ticket_id"});
  ticket_comments.belongsTo(users, { as: "comment_user", foreignKey: "comment_user_id"});
  users.hasMany(ticket_comments, { as: "ticket_comments", foreignKey: "comment_user_id"});
  tickets.belongsTo(users, { as: "close_user", foreignKey: "close_user_id"});
  users.hasMany(tickets, { as: "tickets", foreignKey: "close_user_id"});
  tickets.belongsTo(users, { as: "open_user", foreignKey: "open_user_id"});
  users.hasMany(tickets, { as: "open_user_tickets", foreignKey: "open_user_id"});
  tickets.belongsTo(users, { as: "status_user", foreignKey: "status_user_id"});
  users.hasMany(tickets, { as: "status_user_tickets", foreignKey: "status_user_id"});

  return {
    AppPermission: AppPermission,
    AppRole: AppRole,
    AppUser: AppUser,
    Audit: Audit,
    _rolePermission: _rolePermission,
    _userRole: _userRole,
    customers: customers,
    service_types: service_types,
    statuses: statuses,
    ticket_categories: ticket_categories,
    ticket_comments: ticket_comments,
    tickets: tickets,
    users: users,
  };
}
