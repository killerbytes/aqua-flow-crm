import { CreationOptional, DataTypes, Model } from "sequelize";
import { sequelize } from "../db/database";

export class ProductInventory extends Model {
  declare productId: number;
  declare name: string;
  declare stockInStation: number;
  declare stockWithCustomers: number;
  declare stockDamaged: number;
  declare stockLost: number;
  declare unitPrice: number;
  declare isLendOnly: boolean;
  declare isDefault: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt?: CreationOptional<Date> | null;
}
ProductInventory.init(
  {
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
    unitPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
    isLendOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "ProductInventory",
    tableName: "product_inventories",
    timestamps: true,
    paranoid: true,
  },
);
