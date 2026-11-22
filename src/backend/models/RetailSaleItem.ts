import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { moneyColumn } from "./moneyColumn";
import { columns } from "./plain";
import type { RetailProduct } from "./RetailProduct";
import type { RetailSale } from "./RetailSale";

/** One line of a retail sale, at the product's base price when it was sold. */
export class RetailSaleItem extends Model<
  InferAttributes<RetailSaleItem>,
  InferCreationAttributes<RetailSaleItem>
> {
  declare itemId: CreationOptional<number>;
  declare saleId: number;
  declare productId: number;
  declare quantity: number;
  declare unitPrice: number;

  declare product?: NonAttribute<RetailProduct>;
  declare sale?: NonAttribute<RetailSale>;
}

RetailSaleItem.init(
  columns<RetailSaleItem>({
    itemId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "item_id",
    },
    saleId: { type: DataTypes.INTEGER, allowNull: false, field: "sale_id" },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, field: "quantity" },
    unitPrice: moneyColumn("unitPrice", {
      allowNull: false,
      field: "unit_price",
    }),
  }),
  {
    sequelize,
    modelName: "RetailSaleItem",
    tableName: "retail_sale_items",
    timestamps: false,
  },
);
