import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ticket_categories, ticket_categoriesId } from './ticket_categories';
import type { tickets, ticketsId } from './tickets';
import type { users, usersId } from './users';

export interface customersAttributes {
  customer_id: number;
  customer_name: string;
  customer_code: string;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type customersPk = "customer_id";
export type customersId = customers[customersPk];
export type customersOptionalAttributes = "last_update_date" | "last_update_user";
export type customersCreationAttributes = Optional<customersAttributes, customersOptionalAttributes>;

export class customers extends Model<customersAttributes, customersCreationAttributes> implements customersAttributes {
  customer_id!: number;
  customer_name!: string;
  customer_code!: string;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // customers hasMany ticket_categories via customer_id
  ticket_categories!: ticket_categories[];
  getTicket_categories!: Sequelize.HasManyGetAssociationsMixin<ticket_categories>;
  setTicket_categories!: Sequelize.HasManySetAssociationsMixin<ticket_categories, ticket_categoriesId>;
  addTicket_category!: Sequelize.HasManyAddAssociationMixin<ticket_categories, ticket_categoriesId>;
  addTicket_categories!: Sequelize.HasManyAddAssociationsMixin<ticket_categories, ticket_categoriesId>;
  createTicket_category!: Sequelize.HasManyCreateAssociationMixin<ticket_categories>;
  removeTicket_category!: Sequelize.HasManyRemoveAssociationMixin<ticket_categories, ticket_categoriesId>;
  removeTicket_categories!: Sequelize.HasManyRemoveAssociationsMixin<ticket_categories, ticket_categoriesId>;
  hasTicket_category!: Sequelize.HasManyHasAssociationMixin<ticket_categories, ticket_categoriesId>;
  hasTicket_categories!: Sequelize.HasManyHasAssociationsMixin<ticket_categories, ticket_categoriesId>;
  countTicket_categories!: Sequelize.HasManyCountAssociationsMixin;
  // customers hasMany tickets via customer_id
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
  // customers hasMany users via customer_id
  users!: users[];
  getUsers!: Sequelize.HasManyGetAssociationsMixin<users>;
  setUsers!: Sequelize.HasManySetAssociationsMixin<users, usersId>;
  addUser!: Sequelize.HasManyAddAssociationMixin<users, usersId>;
  addUsers!: Sequelize.HasManyAddAssociationsMixin<users, usersId>;
  createUser!: Sequelize.HasManyCreateAssociationMixin<users>;
  removeUser!: Sequelize.HasManyRemoveAssociationMixin<users, usersId>;
  removeUsers!: Sequelize.HasManyRemoveAssociationsMixin<users, usersId>;
  hasUser!: Sequelize.HasManyHasAssociationMixin<users, usersId>;
  hasUsers!: Sequelize.HasManyHasAssociationsMixin<users, usersId>;
  countUsers!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof customers {
    return customers.init({
    customer_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      primaryKey: true
    },
    customer_name: {
      type: DataTypes.STRING(250),
      allowNull: false
    },
    customer_code: {
      type: DataTypes.STRING(10),
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
    tableName: 'customers',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "customers_pkey",
        unique: true,
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "customers_uk1",
        unique: true,
        fields: [
        ]
      },
      {
        name: "customers_uk2",
        unique: true,
        fields: [
        ]
      },
    ]
  });
  }
}
