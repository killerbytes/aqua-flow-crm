import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { ProductInventory } from "./ProductInventory";

export class CustomerEquipmentBalance extends Model {
  declare balanceId: number;
  declare customerId: number;
  declare productId: number;
  declare quantityOwed: number;
  declare quantityTemporaryOwed: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product: NonAttribute<ProductInventory>;
  declare customer: NonAttribute<Customer>;
}
CustomerEquipmentBalance.init(
  {
    balanceId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantityOwed: { type: DataTypes.INTEGER, defaultValue: 0 },
    quantityTemporaryOwed: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "CustomerEquipmentBalance",
    tableName: "customer_equipment_balances",
    timestamps: true,
  },
);
