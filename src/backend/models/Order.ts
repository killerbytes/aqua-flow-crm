import { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { OrderDetail } from "./OrderDetail";
import { moneyColumn } from "./moneyColumn";
import { User } from "./User";

export class Order extends Model {
  declare orderId: number;
  declare customerId: number;
  declare totalAmount: number;
  declare status: OrderStatus;
  declare paymentStatus: PaymentStatus;
  declare paymentMethod: PaymentMethod;
  declare paymentNotes: string;

  declare createdBy: number;
  declare deliveredAt: Date | null;
  declare deliveredBy: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare customer?: NonAttribute<Customer>;
  declare user: NonAttribute<User>;
  declare orderDetails: NonAttribute<OrderDetail[]>;
}
Order.init(
  {
    orderId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    totalAmount: moneyColumn("totalAmount", { defaultValue: 0 }),
    status: {
      type: DataTypes.ENUM(...Object.values(OrderStatus)),
      defaultValue: OrderStatus.PENDING,
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      defaultValue: PaymentStatus.UNPAID,
    },
    paymentMethod: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
    },
    paymentNotes: {
      type: DataTypes.TEXT,
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, field: "delivered_at" },
    deliveredBy: { type: DataTypes.INTEGER, allowNull: true, field: "delivered_by" },
  },
  { sequelize, modelName: "Order", tableName: "orders", timestamps: true },
);
