import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { ProductInventory } from "./ProductInventory";

export class CustomerSpecialPricing extends Model {
  declare pricingId: number;
  declare customerId: number;
  declare productId: number;
  declare discountAmount: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt?: CreationOptional<Date> | null;

  declare product: NonAttribute<ProductInventory>;
}
CustomerSpecialPricing.init(
  {
    pricingId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    discountAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "CustomerSpecialPricing",
    tableName: "customer_special_pricings",
    timestamps: true,
    paranoid: true,
  },
);
