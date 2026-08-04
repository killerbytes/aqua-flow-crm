import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { ProductInventory } from "./ProductInventory";

export class InventoryAdjustment extends Model {
  declare adjustmentId: number;
  declare productId: number;
  declare adjustmentType: string;
  declare quantity: number;
  declare reason: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product: NonAttribute<ProductInventory>;
}
InventoryAdjustment.init(
  {
    adjustmentId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    adjustmentType: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "InventoryAdjustment",
    tableName: "inventory_adjustments",
    timestamps: true,
  },
);
