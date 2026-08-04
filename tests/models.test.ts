import { describe, expect, it } from "vitest";
import {
  CustomerSchema,
  EquipmentLogSchema,
} from "../src/backend/schemas/zodSchemas";
import { CustomerStatus, EquipmentActionType } from "../src/lib/definitions";

describe("CRM Domain Logic & Validation Schemas", () => {
  it("should validate valid customer creation schema", () => {
    const validCustomer = {
      name: "Water Supply Co",
      address: "100 Industrial Parkway",
      phone: "+63 917 111 2222",
      status: CustomerStatus.ACTIVE,
    };
    const parsed = CustomerSchema.parse(validCustomer);
    expect(parsed.name).toBe("Water Supply Co");
  });

  it("should reject customer schema with short address or name", () => {
    const invalidCustomer = {
      name: "A",
      address: "123",
      phone: "123",
    };
    expect(() => CustomerSchema.parse(invalidCustomer)).toThrow();
  });

  it("should validate equipment log schema and action types", () => {
    const log = {
      customerId: 1,
      productId: 2,
      actionType: EquipmentActionType.ISSUE,
      quantity: 5,
      notes: "Issued 5 containers",
    };
    const parsed = EquipmentLogSchema.parse(log);
    expect(parsed.quantity).toBe(5);
    expect(parsed.actionType).toBe(EquipmentActionType.ISSUE);
  });
});
