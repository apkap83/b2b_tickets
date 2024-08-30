import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { customers, customersId } from './customers';
import type { tickets, ticketsId } from './tickets';

export interface ticket_categoriesAttributes {
  category_id: number;
  customer_id: number;
  category_name: string;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type ticket_categoriesPk = "category_id";
export type ticket_categoriesId = ticket_categories[ticket_categoriesPk];
export type ticket_categoriesOptionalAttributes = "last_update_date" | "last_update_user";
export type ticket_categoriesCreationAttributes = Optional<ticket_categoriesAttributes, ticket_categoriesOptionalAttributes>;

export class ticket_categories extends Model<ticket_categoriesAttributes, ticket_categoriesCreationAttributes> implements ticket_categoriesAttributes {
  category_id!: number;
  customer_id!: number;
  category_name!: string;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // ticket_categories belongsTo customers via customer_id
  customer!: customers;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<customers>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<customers, customersId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<customers>;
  // ticket_categories hasMany tickets via category_id
  tickets!: tickets[];
  getTickets!: Sequelize.HasManyGetAssociationsMixin<tickets>;
  setTickets!: Sequelize.HasManySetAssociationsMixin<tickets, ticketsId>;
  addTicket!: Sequelize.HasManyAddAssociationMixin<tickets, ticketsId>;
  addTickets!: Sequelize.HasManyAddAssociationsMixin<tickets, ticketsId>;
  createTicket!: Sequelize.HasManyCreateAssociationMixin<tickets>;
  removeTicket!: Sequelize.HasManyRemoveAssociationMixin<tickets, ticketsId>;
  removeTickets!: Sequelize.HasManyRemoveAssociationsMixin<tickets, ticketsId>;
  hasTicket!: Sequelize.HasManyHasAssociationMixin<tickets, ticketsId>;
  hasTickets!: Sequelize.HasManyHasAssociationsMixin<tickets, ticketsId>;
  countTickets!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof ticket_categories {
    return ticket_categories.init({
    category_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    record_version: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    creation_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    creation_user: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    last_update_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_update_user: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    last_update_process: {
      type: DataTypes.STRING(250),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'ticket_categories',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "cat_cust_fki",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "cat_uk1",
        unique: true,
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "ticket_categories_pkey",
        unique: true,
        fields: [
          { name: "category_id" },
        ]
      },
    ]
  });
  }
}
