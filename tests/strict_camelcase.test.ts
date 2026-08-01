import { describe, it, expect } from "vitest";
import { CustomerSchema, ProductInventorySchema, EquipmentLogSchema, OrderSchema } from "../src/backend/schemas/zodSchemas";
import { CustomerType, EquipmentActionType, OrderStatus, PaymentStatus } from "../src/lib/definitions";

describe("Strict CamelCase Zod Validation (No Legacy Fallbacks)", () => {
  it("should validate CustomerSchema strictly with customerType", () => {
    const valid = CustomerSchema.safeParse({
      name: "Acme Corp",
      address: "123 Main St",
      phone: "+639171234567",
      customerType: CustomerType.COMMERCIAL,
    });
    expect(valid.success).toBe(true);

    const invalid = CustomerSchema.safeParse({
      name: "Acme Corp",
      address: "123 Main St",
      phone: "+639171234567",
      customer_type: CustomerType.COMMERCIAL,
    });
    expect(invalid.success).toBe(false);
  });

  it("should validate ProductInventorySchema strictly with stockInStation and unitPrice", () => {
    const valid = ProductInventorySchema.safeParse({
      name: "5-Gallon Bottle",
      stockInStation: 100,
      unitPrice: 50.0,
    });
    expect(valid.success).toBe(true);

    const invalid = ProductInventorySchema.safeParse({
      name: "5-Gallon Bottle",
      stock_in_station: 100,
      unit_price: 50.0,
    });
    expect(invalid.success).toBe(false);
  });

  it("should validate EquipmentLogSchema strictly with customerId, productId, actionType", () => {
    const valid = EquipmentLogSchema.safeParse({
      customerId: 1,
      productId: 2,
      actionType: EquipmentActionType.ISSUE,
      quantity: 5,
    });
    expect(valid.success).toBe(true);

    const invalid = EquipmentLogSchema.safeParse({
      customer_id: 1,
      product_id: 2,
      action_type: EquipmentActionType.ISSUE,
      quantity: 5,
    });
    expect(invalid.success).toBe(false);
  });

  it("should validate OrderSchema strictly with customerId, paymentStatus, and items", () => {
    const valid = OrderSchema.safeParse({
      customerId: 1,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
    });
    expect(valid.success).toBe(true);

    const invalid = OrderSchema.safeParse({
      customer_id: 1,
      status: OrderStatus.PENDING,
      payment_status: PaymentStatus.UNPAID,
      items: [{ product_id: 1, quantity: 2, unit_price: 50.0 }],
    });
    expect(invalid.success).toBe(false);
  });
});
