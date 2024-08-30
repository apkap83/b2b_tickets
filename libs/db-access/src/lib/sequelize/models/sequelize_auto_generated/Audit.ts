import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppPermission, AppPermissionId } from './AppPermission';
import type { AppRole, AppRoleId } from './AppRole';
import type { AppUser, AppUserId } from './AppUser';

export interface AuditAttributes {
  id: number;
  action: string;
  description?: string;
  userId?: number;
  roleId?: number;
  permissionId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditPk = "id";
export type AuditId = Audit[AuditPk];
export type AuditOptionalAttributes = "id" | "description" | "userId" | "roleId" | "permissionId" | "createdAt" | "updatedAt";
export type AuditCreationAttributes = Optional<AuditAttributes, AuditOptionalAttributes>;

export class Audit extends Model<AuditAttributes, AuditCreationAttributes> implements AuditAttributes {
  id!: number;
  action!: string;
  description?: string;
  userId?: number;
  roleId?: number;
  permissionId?: number;
  createdAt!: Date;
  updatedAt!: Date;

  // Audit belongsTo AppPermission via permissionId
  permission!: AppPermission;
  getPermission!: Sequelize.BelongsToGetAssociationMixin<AppPermission>;
  setPermission!: Sequelize.BelongsToSetAssociationMixin<AppPermission, AppPermissionId>;
  createPermission!: Sequelize.BelongsToCreateAssociationMixin<AppPermission>;
  // Audit belongsTo AppRole via roleId
  role!: AppRole;
  getRole!: Sequelize.BelongsToGetAssociationMixin<AppRole>;
  setRole!: Sequelize.BelongsToSetAssociationMixin<AppRole, AppRoleId>;
  createRole!: Sequelize.BelongsToCreateAssociationMixin<AppRole>;
  // Audit belongsTo AppUser via userId
  user!: AppUser;
  getUser!: Sequelize.BelongsToGetAssociationMixin<AppUser>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<AppUser, AppUserId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<AppUser>;

  static initModel(sequelize: Sequelize.Sequelize): typeof Audit {
    return Audit.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'AppUser',
        key: 'id'
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'AppRole',
        key: 'id'
      }
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'AppPermission',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'Audit',
    schema: 'b2btickets_dev',
    timestamps: true,
    indexes: [
      {
        name: "Audit_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
