// import dayjs, { Dayjs } from 'dayjs';
// import customParseFormat from 'dayjs/plugin/customParseFormat';
// dayjs.extend(customParseFormat);

import { AuthenticationTypes } from '@b2b-tickets/shared-models';
import { sequelize } from '../../sequelize';

const {
  models: { B2BUser, AppRole, AppPermission },
} = sequelize;

export const populateDB = async () => {
  await B2BUser.findOrCreate({
    where: { userName: 'admin' },
    defaults: {
      firstName: 'Administrator',
      lastName: 'Administrator',
      userName: 'admin',
      password: 'a12345',
      mobilePhone: '0123456789',
      email: 'test@test.gr',
      active: true,
      authenticationType: AuthenticationTypes.LOCAL,
    },
  });

  await B2BUser.findOrCreate({
    where: { userName: 'nkaretat' },
    defaults: {
      firstName: 'Nikos',
      lastName: 'Karetatos',
      userName: 'akapetan',
      password: 'a12345',
      mobilePhone: '6936234556',
      email: 'nikos.karetatos@company.com',
      active: true,
      authenticationType: AuthenticationTypes.LOCAL,
    },
  });

  await B2BUser.findOrCreate({
    where: { userName: 'ppapadop' },
    defaults: {
      firstName: 'Petros',
      lastName: 'Papadopoulos',
      userName: 'ppapadop',
      password: 'a1dasdas!',
      mobilePhone: '6935533442',
      email: 'p.papadopoulos@mycompany.com',
      active: true,
      authenticationType: AuthenticationTypes.LOCAL,
    },
  });

  await AppRole.findOrCreate({
    where: { roleName: 'Admin' },
    defaults: {
      roleName: 'Admin',
      description: 'Admin User',
    },
  });

  await AppRole.findOrCreate({
    where: { roleName: 'NMS_Member' },
    defaults: {
      roleName: 'NMS_Member',
      description: 'Member of NMS Team',
    },
  });

  const IPOperationsRole = await AppRole.findOrCreate({
    where: { roleName: 'IP Operations' },
    defaults: {
      roleName: 'IP Operations',
      description: 'IP Operations Role',
    },
  });

  await AppPermission.findOrCreate({
    where: { permissionName: 'API_Admin' },
    defaults: {
      permissionName: 'API_Admin',
      description: 'Full Access for All API Endpoints',
    },
  });

  await AppPermission.findOrCreate({
    where: { permissionName: 'API_Security_Management' },
    defaults: {
      permissionName: 'API_Security_Management',
      description: 'Full Access for All Security Endpoints',
    },
  });

  const adminUser = await B2BUser.findOne({
    where: {
      userName: 'admin',
    },
  });

  const adminRole = await AppRole.findOne({
    where: {
      roleName: 'Admin',
    },
  });

  const permissionAPIAdmin = await AppPermission.findOne({
    where: {
      permissionName: 'API_Admin',
    },
  });

  const permissionAPISecurityManagement = await AppPermission.findOne({
    where: {
      permissionName: 'API_Security_Management',
    },
  });

  // @ts-ignore
  await adminUser.addAppRole(adminRole);
  // @ts-ignore
  await adminRole.addAppPermission(permissionAPIAdmin);
  // @ts-ignore
  await adminRole.addAppPermission(permissionAPISecurityManagement);
};
