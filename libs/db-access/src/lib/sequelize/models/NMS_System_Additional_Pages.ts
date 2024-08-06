import { Sequelize, Model, DataTypes } from 'sequelize';

interface NMS_System_Additional_Pages_Attributes {
  id: number;
  urlDescription: string;
  url: string;
}

export const NMS_Systems_Additional_Pages = (sequelize: Sequelize) => {
  sequelize.define<Model<NMS_System_Additional_Pages_Attributes>>(
    'NMS_Systems_Additional_Pages',
    {
      // Explicitly define the id column
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      urlDescription: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
    }
  );
};
