import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppRole, AppRoleId } from './AppRole';
import type { Audit, AuditId } from './Audit';
import type { _rolePermission, _rolePermissionId } from './_rolePermission';

export interface AppPermissionAttributes {
  id: number;
  permissionName: string;
  endPoint?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppPermissionPk = "id";
export type AppPermissionId = AppPermission[AppPermissionPk];
export type AppPermissionOptionalAttributes = "id" | "endPoint" | "description" | "createdAt" | "updatedAt";
export type AppPermissionCreationAttributes = Optional<AppPermissionAttributes, AppPermissionOptionalAttributes>;

export class AppPermission extends Model<AppPermissionAttributes, AppPermissionCreationAttributes> implements AppPermissionAttributes {
  id!: number;
  permissionName!: string;
  endPoint?: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;

  // AppPermission belongsToMany AppRole via AppPermissionId and AppRoleId
  AppRoleId_AppRoles!: AppRole[];
  getAppRoleId_AppRoles!: Sequelize.BelongsToManyGetAssociationsMixin<AppRole>;
  setAppRoleId_AppRoles!: Sequelize.BelongsToManySetAssociationsMixin<AppRole, AppRoleId>;
  addAppRoleId_AppRole!: Sequelize.BelongsToManyAddAssociationMixin<AppRole, AppRoleId>;
  addAppRoleId_AppRoles!: Sequelize.BelongsToManyAddAssociationsMixin<AppRole, AppRoleId>;
  createAppRoleId_AppRole!: Sequelize.BelongsToManyCreateAssociationMixin<AppRole>;
  removeAppRoleId_AppRole!: Sequelize.BelongsToManyRemoveAssociationMixin<AppRole, AppRoleId>;
  removeAppRoleId_AppRoles!: Sequelize.BelongsToManyRemoveAssociationsMixin<AppRole, AppRoleId>;
  hasAppRoleId_AppRole!: Sequelize.BelongsToManyHasAssociationMixin<AppRole, AppRoleId>;
  hasAppRoleId_AppRoles!: Sequelize.BelongsToManyHasAssociationsMixin<AppRole, AppRoleId>;
  countAppRoleId_AppRoles!: Sequelize.BelongsToManyCountAssociationsMixin;
  // AppPermission hasMany Audit via permissionId
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
  // AppPermission hasMany _rolePermission via AppPermissionId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof AppPermission {
    return AppPermission.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    permissionName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    endPoint: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'AppPermission',
    schema: 'b2btickets_dev',
    timestamps: true,
    indexes: [
      {
        name: "AppPermission_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_permissionName",
        unique: true,
        fields: [
          { name: "permissionName" },
        ]
      },
    ]
  });
  }
}
