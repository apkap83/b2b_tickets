import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { AppRole, AppRoleId } from './AppRole';
import type { AppUser, AppUserId } from './AppUser';

export interface _userRoleAttributes {
  AppUserId: number;
  AppRoleId: number;
}

export type _userRolePk = "AppUserId" | "AppRoleId";
export type _userRoleId = _userRole[_userRolePk];
export type _userRoleCreationAttributes = _userRoleAttributes;

export class _userRole extends Model<_userRoleAttributes, _userRoleCreationAttributes> implements _userRoleAttributes {
  AppUserId!: number;
  AppRoleId!: number;

  // _userRole belongsTo AppRole via AppRoleId
  AppRole!: AppRole;
  getAppRole!: Sequelize.BelongsToGetAssociationMixin<AppRole>;
  setAppRole!: Sequelize.BelongsToSetAssociationMixin<AppRole, AppRoleId>;
  createAppRole!: Sequelize.BelongsToCreateAssociationMixin<AppRole>;
  // _userRole belongsTo AppUser via AppUserId
  AppUser!: AppUser;
  getAppUser!: Sequelize.BelongsToGetAssociationMixin<AppUser>;
  setAppUser!: Sequelize.BelongsToSetAssociationMixin<AppUser, AppUserId>;
  createAppUser!: Sequelize.BelongsToCreateAssociationMixin<AppUser>;

  static initModel(sequelize: Sequelize.Sequelize): typeof _userRole {
    return _userRole.init({
    AppUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'AppUser',
        key: 'id'
      }
    },
    AppRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'AppRole',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: '_userRole',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "_userRole_pkey",
        unique: true,
        fields: [
          { name: "AppUserId" },
          { name: "AppRoleId" },
        ]
      },
    ]
  });
  }
}
