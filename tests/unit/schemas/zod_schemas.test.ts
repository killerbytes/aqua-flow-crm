import { describe, expect, it } from "vitest";
import {
  CustomerSchema,
  EquipmentLogSchema,
  OrderSchema,
  ProductInventorySchema,
  UserFormSchema,
  UserFormUpdateSchema,
} from "../../../src/backend/schemas/zodSchemas";
import {
  CustomerStatus,
  EquipmentActionType,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "../../../src/lib/definitions";

describe("Unit - Zod Validation Schemas", () => {
  describe("Strict CamelCase Validation", () => {
    it("should validate CustomerSchema strictly with camelCase properties", () => {
      const valid = CustomerSchema.safeParse({
        name: "Acme Corp",
        address: "123 Main St",
        phone: "+639171234567",
        status: CustomerStatus.ACTIVE,
      });
      expect(valid.success).toBe(true);

      const invalid = CustomerSchema.safeParse({
        address: "123 Main St",
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

  describe("Conditional User Form Schemas", () => {
    it("validates full payload including passwords when creating user", () => {
      const createPayload = {
        name: "John Doe",
        username: "johndoe",
        password: "password123",
        confirmPassword: "password123",
        role: UserRole.CASHIER,
        isActive: true,
      };

      const result = UserFormSchema.safeParse(createPayload);
      expect(result.success).toBe(true);
    });

    it("fails creation payload when password and confirmPassword do not match", () => {
      const createPayload = {
        name: "John Doe",
        username: "johndoe",
        password: "password123",
        confirmPassword: "differentpassword",
        role: UserRole.CASHIER,
        isActive: true,
      };

      const result = UserFormSchema.safeParse(createPayload);
      expect(result.success).toBe(false);
    });

    it("validates update payload without password fields when updating user", () => {
      const updatePayload = {
        name: "John Doe Updated",
        username: "johndoe",
        role: UserRole.MANAGER,
        isActive: true,
      };

      const result = UserFormUpdateSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("password");
        expect(result.data).not.toHaveProperty("confirmPassword");
      }
    });
  });
});
