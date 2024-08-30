import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppRole, AppRoleId } from './AppRole';
import type { Audit, AuditId } from './Audit';
import type { _userRole, _userRoleId } from './_userRole';

export interface AppUserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  password?: string;
  mobilePhone: string;
  email: string;
  active?: boolean;
  authenticationType: "LOCAL" | "LDAP";
  createdAt: Date;
  updatedAt: Date;
}

export type AppUserPk = "id";
export type AppUserId = AppUser[AppUserPk];
export type AppUserOptionalAttributes = "id" | "password" | "active" | "createdAt" | "updatedAt";
export type AppUserCreationAttributes = Optional<AppUserAttributes, AppUserOptionalAttributes>;

export class AppUser extends Model<AppUserAttributes, AppUserCreationAttributes> implements AppUserAttributes {
  id!: number;
  firstName!: string;
  lastName!: string;
  userName!: string;
  password?: string;
  mobilePhone!: string;
  email!: string;
  active?: boolean;
  authenticationType!: "LOCAL" | "LDAP";
  createdAt!: Date;
  updatedAt!: Date;

  // AppUser belongsToMany AppRole via AppUserId and AppRoleId
  AppRoleId_AppRole__userRoles!: AppRole[];
  getAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManyGetAssociationsMixin<AppRole>;
  setAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManySetAssociationsMixin<AppRole, AppRoleId>;
  addAppRoleId_AppRole__userRole!: Sequelize.BelongsToManyAddAssociationMixin<AppRole, AppRoleId>;
  addAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManyAddAssociationsMixin<AppRole, AppRoleId>;
  createAppRoleId_AppRole__userRole!: Sequelize.BelongsToManyCreateAssociationMixin<AppRole>;
  removeAppRoleId_AppRole__userRole!: Sequelize.BelongsToManyRemoveAssociationMixin<AppRole, AppRoleId>;
  removeAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManyRemoveAssociationsMixin<AppRole, AppRoleId>;
  hasAppRoleId_AppRole__userRole!: Sequelize.BelongsToManyHasAssociationMixin<AppRole, AppRoleId>;
  hasAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManyHasAssociationsMixin<AppRole, AppRoleId>;
  countAppRoleId_AppRole__userRoles!: Sequelize.BelongsToManyCountAssociationsMixin;
  // AppUser hasMany Audit via userId
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
  // AppUser hasMany _userRole via AppUserId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof AppUser {
    return AppUser.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    userName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(65),
      allowNull: true
    },
    mobilePhone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    authenticationType: {
      type: DataTypes.ENUM("LOCAL","LDAP"),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'AppUser',
    schema: 'b2btickets_dev',
    timestamps: true,
    indexes: [
      {
        name: "AppUser_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_email",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "idx_mobilePhone",
        unique: true,
        fields: [
          { name: "mobilePhone" },
        ]
      },
      {
        name: "idx_userName",
        unique: true,
        fields: [
          { name: "userName" },
        ]
      },
    ]
  });
  }
}
