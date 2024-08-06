import { Sequelize, Model, DataTypes } from 'sequelize';

interface StandByAttributes {
  id: number;
  date: string;
  standByPerson: string;
}

export const StandBy = (sequelize: Sequelize) => {
  sequelize.define<Model<StandByAttributes>>('StandBy', {
    // Explicitly define the id column
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    date: {
      type: DataTypes.DATE(),
      allowNull: false,
    },
    standByPerson: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  });
};
