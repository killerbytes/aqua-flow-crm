import { EquipmentActionType } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model, NonAttribute } from "sequelize";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { ProductInventory } from "./ProductInventory";
import { User } from "./User";

export class EquipmentLog extends Model {
  declare logId: number;
  declare customerId: number;
  declare productId: number;
  declare actionType: EquipmentActionType;
  declare quantity: number;
  declare notes: string;
  declare loggedBy: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare product: NonAttribute<ProductInventory>;
  declare customer: NonAttribute<Customer>;
  declare user: NonAttribute<User>;
}
EquipmentLog.init(
  {
    logId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actionType: {
      type: DataTypes.ENUM(...Object.values(EquipmentActionType)),
      allowNull: false,
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    loggedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "EquipmentLog",
    tableName: "equipment_logs",
    timestamps: true,
  },
);
