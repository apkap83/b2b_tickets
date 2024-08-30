import {
  Sequelize,
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Association,
  HasManyGetAssociationsMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import App from 'next/app';
import { AppRole } from './Role';

export class AppUser extends Model<
  InferAttributes<AppUser>,
  InferCreationAttributes<AppUser>
> {
  declare id: number;
  declare firstName: string;
  declare lastName: string;
  declare userName: string;
  declare password: string;
  declare mobilePhone?: string;
  declare email?: string;
  declare authenticationType: AuthenticationTypes;
  declare active: boolean;

  // Association methods for AppUser
  declare getRoles: BelongsToManyGetAssociationsMixin<AppRole>;
  declare addRole: BelongsToManyAddAssociationMixin<AppRole, number>;

  // Define an instance method to compare passwords
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Static method to initialize the model
  public static initModel(sequelize: Sequelize): typeof AppUser {
    return AppUser.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        firstName: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        lastName: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        userName: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING(65),
        },
        mobilePhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
          validate: {
            len: {
              args: [10, 20],
              msg: 'Mobile Phone must be between 10 and 20 characters',
            },
          },
        },
        email: {
          type: DataTypes.STRING(254),
          allowNull: true,
          validate: {
            isEmail: true,
          },
        },
        authenticationType: {
          type: DataTypes.ENUM(...Object.values(AuthenticationTypes)),
          allowNull: false,
        },
        active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'AppUser',
        indexes: [
          {
            unique: true,
            fields: ['userName'],
            name: 'idx_userName',
          },
          {
            unique: true,
            fields: ['mobilePhone'],
            name: 'idx_mobilePhone',
          },
          {
            unique: true,
            fields: ['email'],
            name: 'idx_email',
          },
        ],
        defaultScope: {
          attributes: { exclude: ['password'] },
        },
        scopes: {
          withPassword: {
            attributes: [
              'id',
              'firstName',
              'lastName',
              'userName',
              'password',
              'email',
              'active',
              'authenticationType',
            ],
          },
        },
        hooks: {
          beforeCreate: async (user) => {
            if (user.password) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
          beforeUpdate: async (user) => {
            if (user.changed('password')) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
        },
      }
    );
  }
}
