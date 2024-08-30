import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppPermission, AppPermissionId } from './AppPermission';
import type { AppUser, AppUserId } from './AppUser';
import type { Audit, AuditId } from './Audit';
import type { _rolePermission, _rolePermissionId } from './_rolePermission';
import type { _userRole, _userRoleId } from './_userRole';

export interface AppRoleAttributes {
  id: number;
  roleName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppRolePk = "id";
export type AppRoleId = AppRole[AppRolePk];
export type AppRoleOptionalAttributes = "id" | "description" | "createdAt" | "updatedAt";
export type AppRoleCreationAttributes = Optional<AppRoleAttributes, AppRoleOptionalAttributes>;

export class AppRole extends Model<AppRoleAttributes, AppRoleCreationAttributes> implements AppRoleAttributes {
  id!: number;
  roleName!: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;

  // AppRole belongsToMany AppPermission via AppRoleId and AppPermissionId
  AppPermissionId_AppPermissions!: AppPermission[];
  getAppPermissionId_AppPermissions!: Sequelize.BelongsToManyGetAssociationsMixin<AppPermission>;
  setAppPermissionId_AppPermissions!: Sequelize.BelongsToManySetAssociationsMixin<AppPermission, AppPermissionId>;
  addAppPermissionId_AppPermission!: Sequelize.BelongsToManyAddAssociationMixin<AppPermission, AppPermissionId>;
  addAppPermissionId_AppPermissions!: Sequelize.BelongsToManyAddAssociationsMixin<AppPermission, AppPermissionId>;
  createAppPermissionId_AppPermission!: Sequelize.BelongsToManyCreateAssociationMixin<AppPermission>;
  removeAppPermissionId_AppPermission!: Sequelize.BelongsToManyRemoveAssociationMixin<AppPermission, AppPermissionId>;
  removeAppPermissionId_AppPermissions!: Sequelize.BelongsToManyRemoveAssociationsMixin<AppPermission, AppPermissionId>;
  hasAppPermissionId_AppPermission!: Sequelize.BelongsToManyHasAssociationMixin<AppPermission, AppPermissionId>;
  hasAppPermissionId_AppPermissions!: Sequelize.BelongsToManyHasAssociationsMixin<AppPermission, AppPermissionId>;
  countAppPermissionId_AppPermissions!: Sequelize.BelongsToManyCountAssociationsMixin;
  // AppRole belongsToMany AppUser via AppRoleId and AppUserId
  AppUserId_AppUsers!: AppUser[];
  getAppUserId_AppUsers!: Sequelize.BelongsToManyGetAssociationsMixin<AppUser>;
  setAppUserId_AppUsers!: Sequelize.BelongsToManySetAssociationsMixin<AppUser, AppUserId>;
  addAppUserId_AppUser!: Sequelize.BelongsToManyAddAssociationMixin<AppUser, AppUserId>;
  addAppUserId_AppUsers!: Sequelize.BelongsToManyAddAssociationsMixin<AppUser, AppUserId>;
  createAppUserId_AppUser!: Sequelize.BelongsToManyCreateAssociationMixin<AppUser>;
  removeAppUserId_AppUser!: Sequelize.BelongsToManyRemoveAssociationMixin<AppUser, AppUserId>;
  removeAppUserId_AppUsers!: Sequelize.BelongsToManyRemoveAssociationsMixin<AppUser, AppUserId>;
  hasAppUserId_AppUser!: Sequelize.BelongsToManyHasAssociationMixin<AppUser, AppUserId>;
  hasAppUserId_AppUsers!: Sequelize.BelongsToManyHasAssociationsMixin<AppUser, AppUserId>;
  countAppUserId_AppUsers!: Sequelize.BelongsToManyCountAssociationsMixin;
  // AppRole hasMany Audit via roleId
  Audits!: Audit[];
  getAudits!: Sequelize.HasManyGetAssociationsMixin<Audit>;
  setAudits!: Sequelize.HasManySetAssociationsMixin<Audit, AuditId>;
  addAudit!: Sequelize.HasManyAddAssociationMixin<Audit, AuditId>;
  addAudits!: Sequelize.HasManyAddAssociationsMixin<Audit, AuditId>;
  createAudit!: Sequelize.HasManyCreateAssociationMixin<Audit>;
  removeAudit!: Sequelize.HasManyRemoveAssociationMixin<Audit, AuditId>;
  removeAudits!: Sequelize.HasManyRemoveAssociationsMixin<Audit, AuditId>;
  hasAudit!: Sequelize.HasManyHasAssociationMixin<Audit, AuditId>;
  hasAudits!: Sequelize.HasManyHasAssociationsMixin<Audit, AuditId>;
  countAudits!: Sequelize.HasManyCountAssociationsMixin;
  // AppRole hasMany _rolePermission via AppRoleId
  _rolePermissions!: _rolePermission[];
  get_rolePermissions!: Sequelize.HasManyGetAssociationsMixin<_rolePermission>;
  set_rolePermissions!: Sequelize.HasManySetAssociationsMixin<_rolePermission, _rolePermissionId>;
  add_rolePermission!: Sequelize.HasManyAddAssociationMixin<_rolePermission, _rolePermissionId>;
  add_rolePermissions!: Sequelize.HasManyAddAssociationsMixin<_rolePermission, _rolePermissionId>;
  create_rolePermission!: Sequelize.HasManyCreateAssociationMixin<_rolePermission>;
  remove_rolePermission!: Sequelize.HasManyRemoveAssociationMixin<_rolePermission, _rolePermissionId>;
  remove_rolePermissions!: Sequelize.HasManyRemoveAssociationsMixin<_rolePermission, _rolePermissionId>;
  has_rolePermission!: Sequelize.HasManyHasAssociationMixin<_rolePermission, _rolePermissionId>;
  has_rolePermissions!: Sequelize.HasManyHasAssociationsMixin<_rolePermission, _rolePermissionId>;
  count_rolePermissions!: Sequelize.HasManyCountAssociationsMixin;
  // AppRole hasMany _userRole via AppRoleId
  _userRoles!: _userRole[];
  get_userRoles!: Sequelize.HasManyGetAssociationsMixin<_userRole>;
  set_userRoles!: Sequelize.HasManySetAssociationsMixin<_userRole, _userRoleId>;
  add_userRole!: Sequelize.HasManyAddAssociationMixin<_userRole, _userRoleId>;
  add_userRoles!: Sequelize.HasManyAddAssociationsMixin<_userRole, _userRoleId>;
  create_userRole!: Sequelize.HasManyCreateAssociationMixin<_userRole>;
  remove_userRole!: Sequelize.HasManyRemoveAssociationMixin<_userRole, _userRoleId>;
  remove_userRoles!: Sequelize.HasManyRemoveAssociationsMixin<_userRole, _userRoleId>;
  has_userRole!: Sequelize.HasManyHasAssociationMixin<_userRole, _userRoleId>;
  has_userRoles!: Sequelize.HasManyHasAssociationsMixin<_userRole, _userRoleId>;
  count_userRoles!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof AppRole {
    return AppRole.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    roleName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'AppRole',
    schema: 'b2btickets_dev',
    timestamps: true,
    indexes: [
      {
        name: "AppRole_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_roleName",
        unique: true,
        fields: [
          { name: "roleName" },
        ]
      },
    ]
  });
  }
}
