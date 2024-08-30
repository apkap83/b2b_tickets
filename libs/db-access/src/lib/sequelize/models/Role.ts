import { Sequelize, Model, DataTypes, Optional } from 'sequelize';

// Define the attributes interface
export interface RoleAttributes {
  id: number;
  roleName: string;
  description?: string;
}

// Define the creation attributes interface
export interface RoleCreationAttributes
  extends Optional<RoleAttributes, 'id' | 'description'> {}

export class AppRole
  extends Model<RoleAttributes, RoleCreationAttributes>
  implements RoleAttributes
{
  public id!: number;
  public roleName!: string;
  public description?: string;

  public static initModel(sequelize: Sequelize): typeof AppRole {
    return AppRole.init(
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
        sequelize,
        modelName: 'AppRole',
        tableName: 'AppRole', // Optional: If you want the table name to be explicitly set
        indexes: [
          {
            unique: true,
            fields: ['roleName'],
            name: 'idx_roleName',
          },
        ],
      }
    );
  }
  // You can also define instance methods here if needed
  // public someInstanceMethod() {
  //   // instance method logic
  // }
}
