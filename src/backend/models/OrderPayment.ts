import { PaymentMethod } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { moneyColumn } from "./moneyColumn";
import { User } from "./User";

/**
 * A payment taken directly on an order, outside any invoice. Payments made
 * through an invoice are InvoicePayment rows instead.
 */
export class OrderPayment extends Model {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare amount: number;
  declare paymentMethod: PaymentMethod | null;
  declare paymentNotes: string | null;
  declare paidAt: Date;
  declare loggedBy: number | null;
  declare reversedAt: Date | null;
  declare reversedBy: number | null;
  declare reversalReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare reversedByUser?: NonAttribute<User>;
}

OrderPayment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: "order_id" },
    amount: moneyColumn("amount", { allowNull: false }),
    // Walk-in sales are recorded paid without a method.
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "payment_method",
    },
    paymentNotes: { type: DataTypes.TEXT, allowNull: true, field: "payment_notes" },
    paidAt: { type: DataTypes.DATE, allowNull: false, field: "paid_at" },
    loggedBy: { type: DataTypes.INTEGER, allowNull: true, field: "logged_by" },
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
    modelName: "OrderPayment",
    tableName: "order_payments",
    timestamps: true,
  },
);
