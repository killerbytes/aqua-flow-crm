import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { columns } from "./plain";
import { ProductInventory } from "./ProductInventory";

export class CustomerEquipmentBalance extends Model<
  InferAttributes<CustomerEquipmentBalance>,
  InferCreationAttributes<CustomerEquipmentBalance>
> {
  declare balanceId: CreationOptional<number>;
  declare customerId: number;
  declare productId: number;
  declare quantityOwed: CreationOptional<number>;
  declare quantityTemporaryOwed: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product: NonAttribute<ProductInventory>;
  declare customer: NonAttribute<Customer>;
}
CustomerEquipmentBalance.init(
  columns<CustomerEquipmentBalance>({
    balanceId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantityOwed: { type: DataTypes.INTEGER, defaultValue: 0 },
    quantityTemporaryOwed: { type: DataTypes.INTEGER, defaultValue: 0 },
  }),
  {
    sequelize,
    modelName: "CustomerEquipmentBalance",
    tableName: "customer_equipment_balances",
    timestamps: true,
  },
);
