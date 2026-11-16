import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { Invoice } from "./Invoice";
import { Order } from "./Order";
import { columns } from "./plain";

export class InvoiceDetail extends Model<
  InferAttributes<InvoiceDetail>,
  InferCreationAttributes<InvoiceDetail>
> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare invoiceId: number;
  declare voidedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare order: NonAttribute<Order>;
  declare invoice: NonAttribute<Invoice>;
}

InvoiceDetail.init(
  columns<InvoiceDetail>({
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
    voidedAt: { type: DataTypes.DATE, allowNull: true, field: "voided_at" },
  }),
  {
    sequelize,
    modelName: "InvoiceDetail",
    tableName: "invoice_details",
    timestamps: true,
    hooks: {},
    // An order can only be on one active invoice. Voided links stay as a record.
    indexes: [
      {
        unique: true,
        fields: ["order_id"],
        name: "idx_invoice_details_order_id",
        where: { voided_at: null },
      },
    ],
  },
);
