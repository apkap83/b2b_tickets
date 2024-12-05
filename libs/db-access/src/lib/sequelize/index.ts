import { Sequelize } from 'sequelize-typescript';

import { config } from '@b2b-tickets/config';
import { sequelizeDBActionsLogger } from '@b2b-tickets/logging';

const B2BUser = require('./models/users').B2BUser;
const AppRole = require('./models/Role').AppRole;
const AppPermission = require('./models/Permission').AppPermission;

// Define a custom logging function for Sequelize
const sequelizeLogger = (msg: string) => {
  sequelizeDBActionsLogger.info(msg);
};

const sequelize = new Sequelize({
  host: config.postgres_b2b_database.host,
  port: config.postgres_b2b_database.port,
  username: config.postgres_b2b_database.username,
  password: process.env['POSTGRES_B2B_PASSWORD'],
  database: config.postgres_b2b_database.db,
  dialect: 'postgres',

  // REMEMBER This is required in NextJS environment
  dialectModule: require('pg'),
  dialectOptions: {
    charset: 'utf8',
  },
  define: {
    freezeTableName: true,
    timestamps: true,
    schema: config.postgres_b2b_database.schemaName,
  },
  // logging: sequelizeLogging,
  pool: {
    max: 14,
    min: 10,
    acquire: 30000,
    idle: 10000,
  },
  logging: sequelizeLogger,
});

B2BUser.initModel(sequelize);
AppRole.initModel(sequelize);
AppPermission.initModel(sequelize);

const applyAssociations = () => {
  try {
    // Association between B2BUser and AppRole through _userRoleB2B table
    B2BUser.belongsToMany(AppRole, {
      through: '_userRoleB2B',
      foreignKey: 'B2BUserUserId', // The column in _userRoleB2B table that references B2BUser
      otherKey: 'AppRoleId', // The column in _userRoleB2B table that references AppRole
      timestamps: false,
    });

    AppRole.belongsToMany(B2BUser, {
      through: '_userRoleB2B',
      foreignKey: 'AppRoleId', // The column in _userRoleB2B table that references AppRole
      otherKey: 'B2BUserUserId', // The column in _userRoleB2B table that references B2BUser
      timestamps: false,
    });

    // Association between AppRole and AppPermission through _rolePermission table
    AppRole.belongsToMany(AppPermission, {
      through: '_rolePermission',
      foreignKey: 'AppRoleId', // The column in _rolePermission table that references AppRole
      otherKey: 'AppPermissionId', // The column in _rolePermission table that references AppPermission
      timestamps: false,
    });

    AppPermission.belongsToMany(AppRole, {
      through: '_rolePermission',
      foreignKey: 'AppPermissionId', // The column in _rolePermission table that references AppPermission
      otherKey: 'AppRoleId', // The column in _rolePermission table that references AppRole
      timestamps: false,
    });
  } catch (error) {
    console.error('Error applying associations:', error);
  }
};

applyAssociations();

// const testAssociations = async () => {
//   try {
//     const user = await B2BUser.findOne({
//       include: [AppRole],
//     });
//     console.log(user);
//   } catch (error) {
//     console.error('Association test failed:', error);
//   }
// };

// testAssociations();

// const testConnection = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log('Connection has been established successfully');
//     sequelize.close();
//   } catch (error) {
//     console.log('Unable to connect to the database', error);
//   }
// };

export { sequelize, AppRole, AppPermission, B2BUser };
