import { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/definitions";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { OrderDetail } from "./OrderDetail";
import type { OrderPayment } from "./OrderPayment";
import { moneyColumn } from "./moneyColumn";
import { columns } from "./plain";
import { User } from "./User";

export class Order extends Model<
  InferAttributes<Order>,
  // Both statuses have defaults, so they are optional on create
  InferCreationAttributes<Order, { omit: "status" | "paymentStatus" }> & {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }
> {
  declare orderId: CreationOptional<number>;
  declare customerId: number;
  declare totalAmount: CreationOptional<number>;
  /** A flat fee on the whole order, already included in totalAmount. */
  declare surcharge: CreationOptional<number>;
  declare status: OrderStatus;
  declare paymentStatus: PaymentStatus;
  declare paymentMethod: PaymentMethod | null;
  declare paymentNotes: string | null;

  declare createdBy: number;
  declare deliveredAt: Date | null;
  declare deliveredBy: number | null;
  declare voidedAt: Date | null;
  declare voidedBy: number | null;
  declare voidReason: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare customer?: NonAttribute<Customer>;
  declare user: NonAttribute<User>;
  declare orderDetails: NonAttribute<OrderDetail[]>;
  declare orderPayments?: NonAttribute<OrderPayment[]>;
  declare deliveredByUser?: NonAttribute<User>;
  declare voidedByUser?: NonAttribute<User>;
}
Order.init(
  columns<Order>({
    orderId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    totalAmount: moneyColumn("totalAmount", { defaultValue: 0 }),
    surcharge: moneyColumn("surcharge", { allowNull: false, defaultValue: 0 }),
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
    voidedAt: { type: DataTypes.DATE, allowNull: true, field: "voided_at" },
    voidedBy: { type: DataTypes.INTEGER, allowNull: true, field: "voided_by" },
    voidReason: { type: DataTypes.TEXT, allowNull: true, field: "void_reason" },
  }),
  { sequelize, modelName: "Order", tableName: "orders", timestamps: true },
);
