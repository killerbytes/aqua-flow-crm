import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Invoice } from "./Invoice";
import { Order } from "./Order";

export class InvoiceDetail extends Model {
  declare orderId: number;
  declare invoiceId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare order: NonAttribute<Order>;
  declare invoice: NonAttribute<Invoice>;
}

InvoiceDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "invoice_id",
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "order_id",
    },
  },
  {
    sequelize,
    modelName: "InvoiceDetail",
    tableName: "invoice_details",
    timestamps: true,
    hooks: {},
  },
);
