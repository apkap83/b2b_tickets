import { Sequelize } from 'sequelize-typescript';

import { config } from '@b2b-tickets/config';
import { AppUser } from './models/User';
import { AppRole } from './models/Role';
import { AppPermission } from './models/Permission';
import { Audit } from './models/Audit';

// import { sequelizeDBActionsLogger } from '@/NMS_Portal/logger';
// Custom logging function
// function sequelizeLogging(msg: string) {
//   sequelizeDBActionsLogger.info(msg);
// }

// const sequelize = new Sequelize("Sequelize_Example_DB", "root", "nsm055!3", {
const sequelize = new Sequelize({
  host: config.postgres_b2b_database.host,
  username: config.postgres_b2b_database.username,
  password: process.env['POSTGRES_B2B_PASSWORD'],
  database: config.postgres_b2b_database.db,
  dialect: 'postgres',

  // REMEMBER This is required in NextJS environment - Please install mysql2 package manually problem
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

const modelDefiners = [AppUser, AppRole, AppPermission, Audit];

for (const modelDefiner of modelDefiners) {
  modelDefiner(sequelize);
}

const applyAssociations = async () => {
  const { AppUser, AppRole, AppPermission, Audit } = sequelize.models;

  AppUser.belongsToMany(AppRole, { through: '_userRole', timestamps: false });
  AppRole.belongsToMany(AppUser, { through: '_userRole', timestamps: false });

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

const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing the database', error);
  }
};

export const syncDatabaseAlterTrue = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing the database', error);
  }
};

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully');
    sequelize.close();
  } catch (error) {
    console.log('Unable to connect to the database', error);
  }
};

export { sequelize, syncDatabase };
