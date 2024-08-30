import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { customers, customersId } from './customers';
import type { ticket_comments, ticket_commentsId } from './ticket_comments';
import type { tickets, ticketsId } from './tickets';

export interface usersAttributes {
  user_id: number;
  customer_id: number;
  username: string;
  password: string;
  password_change_date: Date;
  first_name: string;
  last_name: string;
  mobile_phone?: string;
  email?: string;
  authentication_type: string;
  change_password: string;
  is_active: string;
  is_locked: string;
  locked_reason?: string;
  last_login_attempt: Date;
  last_login_status: string;
  last_login_failed_attempts?: number;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type usersPk = "user_id";
export type usersId = users[usersPk];
export type usersOptionalAttributes = "mobile_phone" | "email" | "locked_reason" | "last_login_failed_attempts" | "last_update_date" | "last_update_user";
export type usersCreationAttributes = Optional<usersAttributes, usersOptionalAttributes>;

export class users extends Model<usersAttributes, usersCreationAttributes> implements usersAttributes {
  user_id!: number;
  customer_id!: number;
  username!: string;
  password!: string;
  password_change_date!: Date;
  first_name!: string;
  last_name!: string;
  mobile_phone?: string;
  email?: string;
  authentication_type!: string;
  change_password!: string;
  is_active!: string;
  is_locked!: string;
  locked_reason?: string;
  last_login_attempt!: Date;
  last_login_status!: string;
  last_login_failed_attempts?: number;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // users belongsTo customers via customer_id
  customer!: customers;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<customers>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<customers, customersId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<customers>;
  // users hasMany ticket_comments via comment_user_id
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
  // users hasMany tickets via close_user_id
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
  // users hasMany tickets via open_user_id
  open_user_tickets!: tickets[];
  getOpen_user_tickets!: Sequelize.HasManyGetAssociationsMixin<tickets>;
  setOpen_user_tickets!: Sequelize.HasManySetAssociationsMixin<tickets, ticketsId>;
  addOpen_user_ticket!: Sequelize.HasManyAddAssociationMixin<tickets, ticketsId>;
  addOpen_user_tickets!: Sequelize.HasManyAddAssociationsMixin<tickets, ticketsId>;
  createOpen_user_ticket!: Sequelize.HasManyCreateAssociationMixin<tickets>;
  removeOpen_user_ticket!: Sequelize.HasManyRemoveAssociationMixin<tickets, ticketsId>;
  removeOpen_user_tickets!: Sequelize.HasManyRemoveAssociationsMixin<tickets, ticketsId>;
  hasOpen_user_ticket!: Sequelize.HasManyHasAssociationMixin<tickets, ticketsId>;
  hasOpen_user_tickets!: Sequelize.HasManyHasAssociationsMixin<tickets, ticketsId>;
  countOpen_user_tickets!: Sequelize.HasManyCountAssociationsMixin;
  // users hasMany tickets via status_user_id
  status_user_tickets!: tickets[];
  getStatus_user_tickets!: Sequelize.HasManyGetAssociationsMixin<tickets>;
  setStatus_user_tickets!: Sequelize.HasManySetAssociationsMixin<tickets, ticketsId>;
  addStatus_user_ticket!: Sequelize.HasManyAddAssociationMixin<tickets, ticketsId>;
  addStatus_user_tickets!: Sequelize.HasManyAddAssociationsMixin<tickets, ticketsId>;
  createStatus_user_ticket!: Sequelize.HasManyCreateAssociationMixin<tickets>;
  removeStatus_user_ticket!: Sequelize.HasManyRemoveAssociationMixin<tickets, ticketsId>;
  removeStatus_user_tickets!: Sequelize.HasManyRemoveAssociationsMixin<tickets, ticketsId>;
  hasStatus_user_ticket!: Sequelize.HasManyHasAssociationMixin<tickets, ticketsId>;
  hasStatus_user_tickets!: Sequelize.HasManyHasAssociationsMixin<tickets, ticketsId>;
  countStatus_user_tickets!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof users {
    return users.init({
    user_id: {
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
    username: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(4000),
      allowNull: false
    },
    password_change_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    mobile_phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    authentication_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    change_password: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    is_active: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    is_locked: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    locked_reason: {
      type: DataTypes.STRING(4000),
      allowNull: true
    },
    last_login_attempt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    last_login_status: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    last_login_failed_attempts: {
      type: DataTypes.DECIMAL,
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
    tableName: 'users',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "users_pk",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "usr_cust_fki",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "usr_uk1",
        unique: true,
        fields: [
          { name: "customer_id" },
        ]
      },
    ]
  });
  }
}
