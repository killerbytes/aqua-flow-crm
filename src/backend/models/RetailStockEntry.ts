import { RetailStockEntryType } from "@/lib/definitions";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { columns } from "./plain";
import type { RetailProduct } from "./RetailProduct";
import type { RetailSale } from "./RetailSale";
import type { User } from "./User";

/**
 * One change to a retail product's stock. Its afterCreate hook in
 * models/index.ts applies `quantityChange` to the product's `stockOnHand`, so
 * entries must be written with `create`: `bulkCreate` skips the hook.
 */
export class RetailStockEntry extends Model<
  InferAttributes<RetailStockEntry>,
  InferCreationAttributes<RetailStockEntry>
> {
  declare entryId: CreationOptional<number>;
  declare productId: number;
  declare type: RetailStockEntryType;
  /** Units added (positive) or taken away (negative). */
  declare quantityChange: number;
  /** The sale a SALE or SALE_VOID entry belongs to. */
  declare saleId: number | null;
  declare notes: string | null;
  declare loggedBy: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product?: NonAttribute<RetailProduct>;
  declare user?: NonAttribute<User>;
  declare sale?: NonAttribute<RetailSale>;
}

RetailStockEntry.init(
  columns<RetailStockEntry>({
    entryId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "entry_id",
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "type",
      validate: { isIn: [Object.values(RetailStockEntryType)] },
    },
    quantityChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "quantity_change",
      validate: {
        notZero(value: number) {
          if (Number(value) === 0) {
            throw new Error("A stock change can't be zero");
          }
        },
      },
    },
    saleId: { type: DataTypes.INTEGER, allowNull: true, field: "sale_id" },
    notes: { type: DataTypes.TEXT, allowNull: true, field: "notes" },
    loggedBy: { type: DataTypes.INTEGER, allowNull: false, field: "logged_by" },
  }),
  {
    sequelize,
    modelName: "RetailStockEntry",
    tableName: "retail_stock_entries",
    timestamps: true,
  },
);
