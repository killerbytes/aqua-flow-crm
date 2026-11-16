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
import { ProductInventory } from "./ProductInventory";

export class CustomerSpecialPricing extends Model<
  InferAttributes<CustomerSpecialPricing>,
  InferCreationAttributes<CustomerSpecialPricing>
> {
  declare pricingId: CreationOptional<number>;
  declare customerId: number;
  declare productId: number;
  declare discountAmount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt?: CreationOptional<Date> | null;

  declare product: NonAttribute<ProductInventory>;
}
CustomerSpecialPricing.init(
  columns<CustomerSpecialPricing>({
    pricingId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    discountAmount: moneyColumn("discountAmount", { defaultValue: 0 }),
  }),
  {
    sequelize,
    modelName: "CustomerSpecialPricing",
    tableName: "customer_special_pricings",
    timestamps: true,
    paranoid: true,
  },
);
