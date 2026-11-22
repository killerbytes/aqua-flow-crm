import { PaymentMethod } from "@/lib/definitions";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import type { Customer } from "./Customer";
import { moneyColumn } from "./moneyColumn";
import { columns } from "./plain";
import type { RetailSaleItem } from "./RetailSaleItem";
import type { User } from "./User";

/**
 * An over-the-counter sale of retail products, paid in full when recorded, so
 * its payment lives on this row. Voiding it keeps the row as a record and
 * returns its units to stock, so every sum of retail sales filters on
 * `voidedAt: null`.
 */
export class RetailSale extends Model<
  InferAttributes<RetailSale>,
  InferCreationAttributes<RetailSale>
> {
  declare saleId: CreationOptional<number>;
  declare customerId: number;
  /** The lines at their base prices, before the discount. */
  declare subtotal: number;
  /** A peso amount off the bill, set by staff. At most the subtotal. */
  declare discount: CreationOptional<number>;
  /** What was paid: the subtotal less the discount. */
  declare totalAmount: number;
  declare paymentMethod: PaymentMethod;
  declare paymentNotes: string | null;
  declare soldAt: Date;
  declare soldBy: number;
  declare voidedAt: CreationOptional<Date | null>;
  declare voidedBy: CreationOptional<number | null>;
  declare voidReason: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare customer?: NonAttribute<Customer>;
  declare items?: NonAttribute<RetailSaleItem[]>;
  declare soldByUser?: NonAttribute<User>;
  declare voidedByUser?: NonAttribute<User>;
}

RetailSale.init(
  columns<RetailSale>({
    saleId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "sale_id",
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "customer_id",
    },
    subtotal: moneyColumn("subtotal", { allowNull: false, field: "subtotal" }),
    discount: moneyColumn("discount", {
      allowNull: false,
      defaultValue: 0,
      field: "discount",
    }),
    totalAmount: moneyColumn("totalAmount", {
      allowNull: false,
      field: "total_amount",
    }),
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "payment_method",
    },
    paymentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "payment_notes",
    },
    soldAt: { type: DataTypes.DATE, allowNull: false, field: "sold_at" },
    soldBy: { type: DataTypes.INTEGER, allowNull: false, field: "sold_by" },
    voidedAt: { type: DataTypes.DATE, allowNull: true, field: "voided_at" },
    voidedBy: { type: DataTypes.INTEGER, allowNull: true, field: "voided_by" },
    voidReason: { type: DataTypes.TEXT, allowNull: true, field: "void_reason" },
  }),
  {
    sequelize,
    modelName: "RetailSale",
    tableName: "retail_sales",
    timestamps: true,
  },
);
