import { InvoiceStatus } from "@/lib/definitions";
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
import { InvoiceDetail } from "./InvoiceDetail";
import type { InvoicePayment } from "./InvoicePayment";
import { moneyColumn } from "./moneyColumn";
import { columns } from "./plain";
import { User } from "./User";

export class Invoice extends Model<
  InferAttributes<Invoice>,
  // status has a default, so it is optional on create
  InferCreationAttributes<Invoice, { omit: "status" }> & {
    status?: InvoiceStatus;
  }
> {
  declare invoiceId: CreationOptional<number>;
  declare customerId: number;
  declare dateIssued: Date;
  declare dueDate: Date | null;
  declare amount: number;
  declare discount: CreationOptional<number>;
  declare status: InvoiceStatus;
  declare paymentDate: Date | null;
  /** The user who created the invoice. */
  declare loggedBy: number;
  declare voidedAt: Date | null;
  declare voidedBy: number | null;
  declare voidReason: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare customer: NonAttribute<Customer>;
  declare invoiceDetails: NonAttribute<InvoiceDetail[]>;
  declare invoicePayments?: NonAttribute<InvoicePayment[]>;
  declare user: NonAttribute<User>;
  declare voidedByUser?: NonAttribute<User>;
}

Invoice.init(
  columns<Invoice>({
    invoiceId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "invoice_id",
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "customer_id",
    },
    dateIssued: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "date_issued",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "due_date",
    },
    amount: moneyColumn("amount", { allowNull: false }),
    discount: moneyColumn("discount", { allowNull: false, defaultValue: 0 }),
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: InvoiceStatus.UNPAID,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "payment_date",
    },
    loggedBy: { type: DataTypes.INTEGER, allowNull: false },
    voidedAt: { type: DataTypes.DATE, allowNull: true, field: "voided_at" },
    voidedBy: { type: DataTypes.INTEGER, allowNull: true, field: "voided_by" },
    voidReason: { type: DataTypes.TEXT, allowNull: true, field: "void_reason" },
  }),
  {
    sequelize,
    modelName: "Invoice",
    tableName: "invoices",
    timestamps: true,
    hooks: {},
  },
);
