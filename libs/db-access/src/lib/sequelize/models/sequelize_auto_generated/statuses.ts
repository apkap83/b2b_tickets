import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { tickets, ticketsId } from './tickets';

export interface statusesAttributes {
  status_id: number;
  status_name: string;
  is_new: string;
  is_final: string;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type statusesPk = "status_id";
export type statusesId = statuses[statusesPk];
export type statusesOptionalAttributes = "last_update_date" | "last_update_user";
export type statusesCreationAttributes = Optional<statusesAttributes, statusesOptionalAttributes>;

export class statuses extends Model<statusesAttributes, statusesCreationAttributes> implements statusesAttributes {
  status_id!: number;
  status_name!: string;
  is_new!: string;
  is_final!: string;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // statuses hasMany tickets via status_id
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

  static initModel(sequelize: Sequelize.Sequelize): typeof statuses {
    return statuses.init({
    status_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      primaryKey: true
    },
    status_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_new: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    is_final: {
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
    tableName: 'statuses',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "statuses_pkey",
        unique: true,
        fields: [
          { name: "status_id" },
        ]
      },
      {
        name: "sts_uk1",
        unique: true,
        fields: [
        ]
      },
    ]
  });
  }
}
