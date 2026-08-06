import { LedgerAccountType, LedgerReferenceType } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { ProductInventory } from "./ProductInventory";
import { User } from "./User";

export class EquipmentLedgerEntry extends Model {
  declare entryId: number;
  declare productId: number;
  declare fromAccountType: LedgerAccountType;
  declare fromAccountId: number | null;
  declare toAccountType: LedgerAccountType;
  declare toAccountId: number | null;
  declare quantity: number;
  declare referenceType: LedgerReferenceType | string;
  declare referenceId: number | null;
  declare notes: string | null;
  declare loggedBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product: NonAttribute<ProductInventory>;
  declare customer: NonAttribute<Customer>;
  declare user: NonAttribute<User>;
}

EquipmentLedgerEntry.init(
  {
    entryId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fromAccountType: {
      type: DataTypes.ENUM(...Object.values(LedgerAccountType)),
      allowNull: false,
    },
    fromAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    toAccountType: {
      type: DataTypes.ENUM(...Object.values(LedgerAccountType)),
      allowNull: false,
    },
    toAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: LedgerReferenceType.MANUAL_LOG,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    loggedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "EquipmentLedgerEntry",
    tableName: "equipment_ledger_entries",
    timestamps: true,
  },
);
