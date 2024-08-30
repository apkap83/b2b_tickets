import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { tickets, ticketsId } from './tickets';

export interface service_typesAttributes {
  service_id: number;
  service_name: string;
  start_date: Date;
  end_date?: Date;
  record_version: number;
  creation_date: Date;
  creation_user: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process: string;
}

export type service_typesPk = "service_id";
export type service_typesId = service_types[service_typesPk];
export type service_typesOptionalAttributes = "end_date" | "last_update_date" | "last_update_user";
export type service_typesCreationAttributes = Optional<service_typesAttributes, service_typesOptionalAttributes>;

export class service_types extends Model<service_typesAttributes, service_typesCreationAttributes> implements service_typesAttributes {
  service_id!: number;
  service_name!: string;
  start_date!: Date;
  end_date?: Date;
  record_version!: number;
  creation_date!: Date;
  creation_user!: string;
  last_update_date?: Date;
  last_update_user?: string;
  last_update_process!: string;

  // service_types hasMany tickets via service_id
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

  static initModel(sequelize: Sequelize.Sequelize): typeof service_types {
    return service_types.init({
    service_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      primaryKey: true
    },
    service_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
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
    tableName: 'service_types',
    schema: 'b2btickets_dev',
    timestamps: false,
    indexes: [
      {
        name: "service_types_pkey",
        unique: true,
        fields: [
          { name: "service_id" },
        ]
      },
      {
        name: "srt_uk1",
        unique: true,
        fields: [
        ]
      },
    ]
  });
  }
}
