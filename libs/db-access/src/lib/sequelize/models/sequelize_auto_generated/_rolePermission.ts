import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppPermission, AppPermissionId } from './AppPermission';
import type { AppRole, AppRoleId } from './AppRole';

export interface _rolePermissionAttributes {
  AppRoleId: number;
  AppPermissionId: number;
}

export type _rolePermissionPk = "AppRoleId" | "AppPermissionId";
export type _rolePermissionId = _rolePermission[_rolePermissionPk];
export type _rolePermissionCreationAttributes = _rolePermissionAttributes;

export class _rolePermission extends Model<_rolePermissionAttributes, _rolePermissionCreationAttributes> implements _rolePermissionAttributes {
  AppRoleId!: number;
  AppPermissionId!: number;

  // _rolePermission belongsTo AppPermission via AppPermissionId
  AppPermission!: AppPermission;
  getAppPermission!: Sequelize.BelongsToGetAssociationMixin<AppPermission>;
  setAppPermission!: Sequelize.BelongsToSetAssociationMixin<AppPermission, AppPermissionId>;
  createAppPermission!: Sequelize.BelongsToCreateAssociationMixin<AppPermission>;
  // _rolePermission belongsTo AppRole via AppRoleId
  AppRole!: AppRole;
  getAppRole!: Sequelize.BelongsToGetAssociationMixin<AppRole>;
  setAppRole!: Sequelize.BelongsToSetAssociationMixin<AppRole, AppRoleId>;
  createAppRole!: Sequelize.BelongsToCreateAssociationMixin<AppRole>;

  static initModel(sequelize: Sequelize.Sequelize): typeof _rolePermission {
    return _rolePermission.init({
    AppRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'AppRole',
        key: 'id'
      }
    },
    AppPermissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'AppPermission',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: '_rolePermission',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "_rolePermission_pkey",
        unique: true,
        fields: [
          { name: "AppRoleId" },
          { name: "AppPermissionId" },
        ]
      },
    ]
  });
  }
}
