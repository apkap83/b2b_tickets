import { Sequelize, Model, DataTypes } from 'sequelize';

interface NMS_System_Attributes {
  id: number;
  systemName: string;
  supplier: string;
  troubleShootingFolder: string;
  mainWebPage: string;
  systemDescription: string;
}

export const NMS_Systems = (sequelize: Sequelize) => {
  sequelize.define<Model<NMS_System_Attributes>>('NMS_Systems', {
    // Explicitly define the id column
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    systemName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    supplier: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    troubleShootingFolder: {
      type: DataTypes.STRING(250),
      allowNull: false,
    },
    mainWebPage: {
      type: DataTypes.STRING(250),
      allowNull: true,
    },
    systemDescription: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
  });
};
