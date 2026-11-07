import { PaymentMethod } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Invoice } from "./Invoice";
import { moneyColumn } from "./moneyColumn";

export class InvoicePayment extends Model {
  declare id: CreationOptional<number>;
  declare invoiceId: number;
  declare paymentDate: Date;
  declare paymentAmount: number;
  declare paymentMethod: PaymentMethod;
  declare paymentNotes?: string;
  declare loggedBy: number;
  declare reversedAt: Date | null;
  declare reversedBy: number | null;
  declare reversalReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare invoice?: NonAttribute<Invoice>;
}

InvoicePayment.init(
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
      references: {
        model: "invoices",
        key: "invoice_id",
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "payment_date",
    },
    paymentAmount: moneyColumn("paymentAmount", {
      allowNull: false,
      field: "payment_amount",
    }),
    paymentMethod: {
      type: DataTypes.ENUM,
      values: Object.values(PaymentMethod),
      allowNull: false,
      field: "payment_method",
    },
    paymentNotes: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "payment_notes",
    },

    loggedBy: { type: DataTypes.INTEGER, allowNull: false },
    reversedAt: { type: DataTypes.DATE, allowNull: true, field: "reversed_at" },
    reversedBy: { type: DataTypes.INTEGER, allowNull: true, field: "reversed_by" },
    reversalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "reversal_reason",
    },
  },
  {
    sequelize,
    modelName: "InvoicePayment",
    tableName: "invoice_payments",
    timestamps: true,
    hooks: {},
  },
);
