import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { customers, customersId } from './customers';
import type { service_types, service_typesId } from './service_types';
import type { statuses, statusesId } from './statuses';
import type { ticket_categories, ticket_categoriesId } from './ticket_categories';
import type { ticket_comments, ticket_commentsId } from './ticket_comments';
import type { users, usersId } from './users';

export interface ticketsAttributes {
  ticket_id: number;
  customer_id: number;
  ticket_number: string;
  title: string;
  description: string;
  category_id: number;
  service_id: number;
  equipment_id: number;
  sid?: string;
  cid?: string;
  username?: string;
  cli?: string;
  contact_person: string;
  contact_phone_number: string;
  occurrence_date: Date;
  open_date: Date;
  open_user_id: number;
  status_id: number;
  status_date: Date;
  status_user_id: number;
  close_date?: Date;
  close_user_id?: number;
  root_cause?: string;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type ticketsPk = "ticket_id";
export type ticketsId = tickets[ticketsPk];
export type ticketsOptionalAttributes = "sid" | "cid" | "username" | "cli" | "close_date" | "close_user_id" | "root_cause" | "last_update_date" | "last_update_user";
export type ticketsCreationAttributes = Optional<ticketsAttributes, ticketsOptionalAttributes>;

export class tickets extends Model<ticketsAttributes, ticketsCreationAttributes> implements ticketsAttributes {
  ticket_id!: number;
  customer_id!: number;
  ticket_number!: string;
  title!: string;
  description!: string;
  category_id!: number;
  service_id!: number;
  equipment_id!: number;
  sid?: string;
  cid?: string;
  username?: string;
  cli?: string;
  contact_person!: string;
  contact_phone_number!: string;
  occurrence_date!: Date;
  open_date!: Date;
  open_user_id!: number;
  status_id!: number;
  status_date!: Date;
  status_user_id!: number;
  close_date?: Date;
  close_user_id?: number;
  root_cause?: string;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // tickets belongsTo customers via customer_id
  customer!: customers;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<customers>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<customers, customersId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<customers>;
  // tickets belongsTo service_types via service_id
  service!: service_types;
  getService!: Sequelize.BelongsToGetAssociationMixin<service_types>;
  setService!: Sequelize.BelongsToSetAssociationMixin<service_types, service_typesId>;
  createService!: Sequelize.BelongsToCreateAssociationMixin<service_types>;
  // tickets belongsTo statuses via status_id
  status!: statuses;
  getStatus!: Sequelize.BelongsToGetAssociationMixin<statuses>;
  setStatus!: Sequelize.BelongsToSetAssociationMixin<statuses, statusesId>;
  createStatus!: Sequelize.BelongsToCreateAssociationMixin<statuses>;
  // tickets belongsTo ticket_categories via category_id
  category!: ticket_categories;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<ticket_categories>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<ticket_categories, ticket_categoriesId>;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<ticket_categories>;
  // tickets hasMany ticket_comments via ticket_id
  ticket_comments!: ticket_comments[];
  getTicket_comments!: Sequelize.HasManyGetAssociationsMixin<ticket_comments>;
  setTicket_comments!: Sequelize.HasManySetAssociationsMixin<ticket_comments, ticket_commentsId>;
  addTicket_comment!: Sequelize.HasManyAddAssociationMixin<ticket_comments, ticket_commentsId>;
  addTicket_comments!: Sequelize.HasManyAddAssociationsMixin<ticket_comments, ticket_commentsId>;
  createTicket_comment!: Sequelize.HasManyCreateAssociationMixin<ticket_comments>;
  removeTicket_comment!: Sequelize.HasManyRemoveAssociationMixin<ticket_comments, ticket_commentsId>;
  removeTicket_comments!: Sequelize.HasManyRemoveAssociationsMixin<ticket_comments, ticket_commentsId>;
  hasTicket_comment!: Sequelize.HasManyHasAssociationMixin<ticket_comments, ticket_commentsId>;
  hasTicket_comments!: Sequelize.HasManyHasAssociationsMixin<ticket_comments, ticket_commentsId>;
  countTicket_comments!: Sequelize.HasManyCountAssociationsMixin;
  // tickets belongsTo users via close_user_id
  close_user!: users;
  getClose_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setClose_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createClose_user!: Sequelize.BelongsToCreateAssociationMixin<users>;
  // tickets belongsTo users via open_user_id
  open_user!: users;
  getOpen_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setOpen_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createOpen_user!: Sequelize.BelongsToCreateAssociationMixin<users>;
  // tickets belongsTo users via status_user_id
  status_user!: users;
  getStatus_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setStatus_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createStatus_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof tickets {
    return tickets.init({
    ticket_id: {
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
    ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(4000),
      allowNull: false
    },
    category_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'ticket_categories',
        key: 'category_id'
      }
    },
    service_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'service_types',
        key: 'service_id'
      }
    },
    equipment_id: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    sid: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    cid: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cli: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    contact_person: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    contact_phone_number: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    occurrence_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    open_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    open_user_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    status_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'statuses',
        key: 'status_id'
      }
    },
    status_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status_user_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    close_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    close_user_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    root_cause: {
      type: DataTypes.STRING(4000),
      allowNull: true
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
    tableName: 'tickets',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "tck_cat_fki",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "tck_cusr_fki",
        fields: [
          { name: "close_user_id" },
        ]
      },
      {
        name: "tck_cust_fki",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "tck_ousr_fki",
        fields: [
          { name: "open_user_id" },
        ]
      },
      {
        name: "tck_srt_fki",
        fields: [
          { name: "service_id" },
        ]
      },
      {
        name: "tck_sts_fki",
        fields: [
          { name: "status_id" },
        ]
      },
      {
        name: "tck_susr_fki",
        fields: [
          { name: "status_user_id" },
        ]
      },
      {
        name: "tck_uk1",
        unique: true,
        fields: [
        ]
      },
      {
        name: "tickets_pkey",
        unique: true,
        fields: [
          { name: "ticket_id" },
        ]
      },
    ]
  });
  }
}
