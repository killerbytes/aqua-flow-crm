import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db/database";
import { moneyColumn } from "./moneyColumn";
import { columns } from "./plain";

/**
 * A brand-new item sold over the counter, such as a new 5-gallon container.
 * Its stock is separate from the refill products' container fleet: a sold unit
 * belongs to the customer. `stockOnHand` changes only through RetailStockEntry
 * rows, whose hook in models/index.ts updates it.
 */
export class RetailProduct extends Model<
  InferAttributes<RetailProduct>,
  InferCreationAttributes<RetailProduct>
> {
  declare productId: CreationOptional<number>;
  declare name: string;
  declare basePrice: CreationOptional<number>;
  declare stockOnHand: CreationOptional<number>;
  declare lowStockThreshold: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RetailProduct.init(
  columns<RetailProduct>({
    productId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "product_id",
    },
    name: { type: DataTypes.STRING, allowNull: false, field: "name" },
    basePrice: moneyColumn("basePrice", {
      allowNull: false,
      defaultValue: 0,
      field: "base_price",
    }),
    stockOnHand: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "stock_on_hand",
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "low_stock_threshold",
    },
  }),
  {
    sequelize,
    modelName: "RetailProduct",
    tableName: "retail_products",
    timestamps: true,
  },
);
