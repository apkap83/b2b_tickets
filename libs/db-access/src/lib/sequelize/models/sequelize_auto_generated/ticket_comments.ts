import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { tickets, ticketsId } from './tickets';
import type { users, usersId } from './users';

export interface ticket_commentsAttributes {
  comment_id: number;
  ticket_id: number;
  comment_date: Date;
  comment_user_id: number;
  comment: string;
  is_closure: string;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type ticket_commentsPk = "comment_id";
export type ticket_commentsId = ticket_comments[ticket_commentsPk];
export type ticket_commentsOptionalAttributes = "last_update_date" | "last_update_user";
export type ticket_commentsCreationAttributes = Optional<ticket_commentsAttributes, ticket_commentsOptionalAttributes>;

export class ticket_comments extends Model<ticket_commentsAttributes, ticket_commentsCreationAttributes> implements ticket_commentsAttributes {
  comment_id!: number;
  ticket_id!: number;
  comment_date!: Date;
  comment_user_id!: number;
  comment!: string;
  is_closure!: string;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // ticket_comments belongsTo tickets via ticket_id
  ticket!: tickets;
  getTicket!: Sequelize.BelongsToGetAssociationMixin<tickets>;
  setTicket!: Sequelize.BelongsToSetAssociationMixin<tickets, ticketsId>;
  createTicket!: Sequelize.BelongsToCreateAssociationMixin<tickets>;
  // ticket_comments belongsTo users via comment_user_id
  comment_user!: users;
  getComment_user!: Sequelize.BelongsToGetAssociationMixin<users>;
  setComment_user!: Sequelize.BelongsToSetAssociationMixin<users, usersId>;
  createComment_user!: Sequelize.BelongsToCreateAssociationMixin<users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ticket_comments {
    return ticket_comments.init({
    comment_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      primaryKey: true
    },
    ticket_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'tickets',
        key: 'ticket_id'
      }
    },
    comment_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    comment_user_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    comment: {
      type: DataTypes.STRING(4000),
      allowNull: false
    },
    is_closure: {
      type: DataTypes.STRING(1),
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
    tableName: 'ticket_comments',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "cmt_tck_fki",
        fields: [
          { name: "ticket_id" },
        ]
      },
      {
        name: "cmt_usr_fki",
        fields: [
          { name: "comment_user_id" },
        ]
      },
      {
        name: "ticket_comments_pkey",
        unique: true,
        fields: [
          { name: "comment_id" },
        ]
      },
    ]
  });
  }
}
