import { Sequelize, DataTypes } from 'sequelize';

export const AppRole = (sequelize: Sequelize) => {
  sequelize.define(
    'AppRole',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      roleName: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['roleName'],
          name: 'idx_roleName',
        },
      ],
    }
  );
};
