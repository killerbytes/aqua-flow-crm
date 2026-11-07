import { InvoiceStatus } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { InvoiceDetail } from "./InvoiceDetail";
import { moneyColumn } from "./moneyColumn";
import { User } from "./User";

export class Invoice extends Model {
  declare invoiceId: number;
  declare customerId: number;
  declare dateIssued: Date;
  declare dueDate: Date;
  declare amount: number;
  declare discount: number;
  declare status: InvoiceStatus;
  declare paymentDate: Date;
  declare createdBy: number;
  declare voidedAt: Date | null;
  declare voidedBy: number | null;
  declare voidReason: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare customer: NonAttribute<Customer>;
  declare invoiceDetails: NonAttribute<InvoiceDetail[]>;
  declare user: NonAttribute<User>;
  declare voidedByUser: NonAttribute<User>;
}

Invoice.init(
  {
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
  },
  {
    sequelize,
    modelName: "Invoice",
    tableName: "invoices",
    timestamps: true,
    hooks: {},
  },
);
