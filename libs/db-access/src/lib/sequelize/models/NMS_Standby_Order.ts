import { Sequelize, Model, DataTypes } from 'sequelize';

interface StandByAttributes {
  id: number;
  standByPerson: string;
}

export const NMS_Standby_Order = (sequelize: Sequelize) => {
  sequelize.define<Model<StandByAttributes>>('NMS_Standby_Order', {
    // Explicitly define the id column
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    standByPerson: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  });
};
