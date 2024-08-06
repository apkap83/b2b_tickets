import { Sequelize, Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { AuthenticationTypes } from '@b2b-tickets/shared-models';

interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  password: string;
  mobilePhone: string;
  authenticationType: AuthenticationTypes;
  email: string;
  active: boolean;
}

export const AppUser = (sequelize: Sequelize) => {
  sequelize.define<Model<UserAttributes>>(
    'AppUser',
    {
      // Explicitly define the id column
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
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Mobile Phone is required',
          },
          len: {
            args: [10, 20],
            msg: 'Mobile Phone must be between 10 and 20 characters',
          },
        },
      },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      authenticationType: {
        type: DataTypes.ENUM(...Object.values(AuthenticationTypes)),
        allowNull: false,
      },
    },
    {
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
          if (user.getDataValue('password')) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(
              user.getDataValue('password'),
              salt
            );
            user.setDataValue('password', hashedPassword);
          }
        },
        beforeUpdate: async (user) => {
          // @ts-ignore
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(
              user.getDataValue('password'),
              salt
            );
            user.setDataValue('password', hashedPassword);
          }
        },

        // TODO: Error: Lock wait timeout exceeded; try restarting transaction
        // afterCreate: async (user: Model<UserAttributes>) => {
        //   await logAudit(
        //     AuditActionTypes.CREATE_USER,
        //     `User create with ID ${user.dataValues.id}`,
        //     user.dataValues.id
        //   );
        // },
      },
    }
  );
};
