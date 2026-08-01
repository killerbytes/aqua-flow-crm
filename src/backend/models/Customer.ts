import { CommonService } from "@/backend/services/commonService";
import { CustomerStatus, CustomerType } from "@/lib/definitions";
import {
  CreationOptional,
  DataTypes,
  Model,
  NonAttribute,
  Order,
} from "sequelize";
import { sequelize } from "../db/database";
import { CustomerEquipmentBalance } from "./CustomerEquipmentBalance";
import { CustomerSpecialPricing } from "./CustomerSpecialPricing";

export class Customer extends Model {
  declare customerId: number;
  declare name: string;
  declare address: string;
  declare phone: string;
  declare customerType: CustomerType;
  declare status: CustomerStatus;
  declare notes: string;
  declare barangayId: string;
  declare barangay?: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare equipmentBalances?: NonAttribute<CustomerEquipmentBalance>[];
  declare specialPricings?: NonAttribute<CustomerSpecialPricing>[];
  declare orders?: NonAttribute<Order>[];
}
Customer.init(
  {
    customerId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    customerType: {
      type: DataTypes.ENUM(...Object.values(CustomerType)),
      defaultValue: CustomerType.RESIDENTIAL,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CustomerStatus)),
      defaultValue: CustomerStatus.ACTIVE,
      allowNull: false,
    },
    barangayId: {
      type: DataTypes.STRING,
    },
    barangay: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("barangayId");
        if (!id) return null;
        return CommonService.getBarangayNameByCode(id);
      },
    },
  },
  {
    sequelize,
    modelName: "Customer",
    tableName: "customers",
    timestamps: true,
  },
);
