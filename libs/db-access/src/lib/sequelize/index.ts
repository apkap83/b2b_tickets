import { Sequelize } from 'sequelize-typescript';

import { config } from '@b2b-tickets/config';

import { AppUser } from './models/User';
import { AppRole } from './models/Role';
import { AppPermission } from './models/Permission';
import { Audit } from './models/Audit';
import { B2BUser } from './models/users';

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
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  // disable logging; default: console log
  // logging: false,
});

// initModels(sequelize);
AppUser.initModel(sequelize);
AppRole.initModel(sequelize);
AppPermission.initModel(sequelize);
B2BUser.initModel(sequelize);
Audit(sequelize);

const applyAssociations = async () => {
  const { AppUser, AppRole, AppPermission, Audit, B2BUser } = sequelize.models;

  AppUser.belongsToMany(AppRole, {
    through: '_userRole',
    timestamps: false,
  });
  B2BUser.belongsToMany(AppRole, {
    through: '_userRoleB2B',
    timestamps: false,
  });

  AppRole.belongsToMany(AppUser, {
    through: '_userRole',
    timestamps: false,
  });
  AppRole.belongsToMany(B2BUser, {
    through: '_userRoleB2B',
    timestamps: false,
  });

  AppRole.belongsToMany(AppPermission, {
    through: '_rolePermission',
    timestamps: false,
  });
  AppPermission.belongsToMany(AppRole, {
    through: '_rolePermission',
    timestamps: false,
  });

  Audit.belongsTo(AppUser, { foreignKey: 'userId' });
  Audit.belongsTo(AppRole, { foreignKey: 'roleId' });
  Audit.belongsTo(AppPermission, { foreignKey: 'permissionId' });
};

applyAssociations();

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully');
    sequelize.close();
  } catch (error) {
    console.log('Unable to connect to the database', error);
  }
};

export { sequelize, AppUser, AppRole, AppPermission, B2BUser };
