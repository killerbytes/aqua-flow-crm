import { CommonService } from "@/backend/services/commonService";
import { CustomerStatus } from "@/lib/definitions";
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
  declare phone?: string;
  declare status: CustomerStatus;
  declare notes: string;
  declare barangayId: string;
  declare barangay?: string;
  declare searchText?: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare equipmentBalances?: NonAttribute<CustomerEquipmentBalance>[];
  declare specialPricings?: NonAttribute<CustomerSpecialPricing>[];
  declare orders?: NonAttribute<Order>[];
}

export function generateCustomerSearchText(customer: any): string {
  const barangayId =
    customer.barangayId || customer.getDataValue?.("barangayId");
  const barangayName = barangayId
    ? CommonService.getBarangayNameByCode(barangayId) || ""
    : "";
  const name = customer.name || customer.getDataValue?.("name") || "";
  const phone = customer.phone || customer.getDataValue?.("phone") || "";
  const address = customer.address || customer.getDataValue?.("address") || "";
  const notes = customer.notes || customer.getDataValue?.("notes") || "";

  const parts = [name, phone, address, barangayName, notes].filter(Boolean);
  return parts.join(" ");
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
    phone: { type: DataTypes.STRING, allowNull: true, unique: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
    searchText: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: "Customer",
    tableName: "customers",
    timestamps: true,
    hooks: {
      beforeSave: (customer: Customer) => {
        customer.searchText = generateCustomerSearchText(customer);
      },
      beforeBulkCreate: (customers: Customer[]) => {
        for (const customer of customers) {
          customer.searchText = generateCustomerSearchText(customer);
        }
      },
    },
  }
);
