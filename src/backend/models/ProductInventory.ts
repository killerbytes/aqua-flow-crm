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

export class ProductInventory extends Model<
  InferAttributes<ProductInventory>,
  InferCreationAttributes<ProductInventory>
> {
  declare productId: CreationOptional<number>;
  declare name: string;
  declare stockInStation: CreationOptional<number>;
  declare stockWithCustomers: CreationOptional<number>;
  declare stockDamaged: CreationOptional<number>;
  declare stockLost: CreationOptional<number>;
  declare unitPrice: CreationOptional<number>;
  declare isLendOnly: CreationOptional<boolean>;
  declare isDefault: CreationOptional<boolean>;
  declare lowStockThreshold: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt?: CreationOptional<Date> | null;
}
ProductInventory.init(
  columns<ProductInventory>({
    productId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    stockInStation: { type: DataTypes.INTEGER, defaultValue: 0 },
    stockWithCustomers: { type: DataTypes.INTEGER, defaultValue: 0 },
    stockDamaged: { type: DataTypes.INTEGER, defaultValue: 0 },
    stockLost: { type: DataTypes.INTEGER, defaultValue: 0 },
    unitPrice: moneyColumn("unitPrice", { defaultValue: 0 }),
    isLendOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "low_stock_threshold",
    },
    deletedAt: DataTypes.DATE,
  }),
  {
    sequelize,
    modelName: "ProductInventory",
    tableName: "product_inventories",
    timestamps: true,
    paranoid: true,
  },
);
