import { describe, expect, it } from "vitest";
import {
  CustomerSchema,
  EquipmentLogSchema,
  InvoicePaymentSchema,
  InvoiceSchema,
  OrderSchema,
  PaymentSchema,
  ProductInventorySchema,
  UserFormSchema,
} from "../../../src/backend/schemas/zodSchemas";
import {
  CustomerStatus,
  EquipmentActionType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../../src/lib/definitions";

describe("Unit - Zod Validation Schemas", () => {
  describe("PaymentSchema", () => {
    it("should validate a valid payment payload", () => {
      const result = PaymentSchema.safeParse({
        paymentMethod: PaymentMethod.CASH,
        paymentNotes: "Paid upon delivery",
      });
      expect(result.success).toBe(true);
    });

    it("should reject an invalid payment method", () => {
      const result = PaymentSchema.safeParse({
        paymentMethod: "BITCOIN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CustomerSchema", () => {
    it("should validate a valid customer payload", () => {
      const result = CustomerSchema.safeParse({
        name: "John Doe",
        address: "123 Main Street",
        phone: "09171234567",
        status: CustomerStatus.ACTIVE,
      });
      expect(result.success).toBe(true);
    });

    it("should reject a customer name shorter than 2 characters", () => {
      const result = CustomerSchema.safeParse({
        name: "A",
        address: "123 Main Street",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid mobile number formats", () => {
      const result = CustomerSchema.safeParse({
        name: "John Doe",
        address: "123 Main Street",
        phone: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("OrderSchema", () => {
    it("should validate a valid order payload", () => {
      const result = OrderSchema.safeParse({
        customerId: 1,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        items: [
          {
            productId: 1,
            quantity: 5,
            unitPrice: 35,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject an order without items", () => {
      const result = OrderSchema.safeParse({
        customerId: 1,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        items: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ProductInventorySchema", () => {
    it("should validate product inventory form data", () => {
      const result = ProductInventorySchema.safeParse({
        name: "5-Gallon Container",
        unitPrice: 200,
        stockInStation: 50,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative unit price", () => {
      const result = ProductInventorySchema.safeParse({
        name: "5-Gallon Container",
        unitPrice: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UserFormSchema", () => {
    it("should validate matching passwords", () => {
      const result = UserFormSchema.safeParse({
        name: "Staff Member",
        username: "staff01",
        password: "secretpassword",
        confirmPassword: "secretpassword",
        role: UserRole.CASHIER,
      });
      expect(result.success).toBe(true);
    });

    it("should fail validation when confirmPassword does not match", () => {
      const result = UserFormSchema.safeParse({
        name: "Staff Member",
        username: "staff01",
        password: "secretpassword",
        confirmPassword: "differentpassword",
        role: UserRole.CASHIER,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("InvoicePaymentSchema", () => {
    it("should validate valid invoice payment data", () => {
      const result = InvoicePaymentSchema.safeParse({
        invoiceId: 10,
        paymentAmount: 500,
        paymentMethod: PaymentMethod.GCASH,
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-positive payment amounts", () => {
      const result = InvoicePaymentSchema.safeParse({
        invoiceId: 10,
        paymentAmount: 0,
        paymentMethod: PaymentMethod.CASH,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("EquipmentLogSchema", () => {
    it("should validate equipment log data", () => {
      const result = EquipmentLogSchema.safeParse({
        customerId: 1,
        productId: 2,
        actionType: EquipmentActionType.ISSUE,
        quantity: 3,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("InvoiceSchema", () => {
    it("should validate invoice data", () => {
      const result = InvoiceSchema.safeParse({
        customerId: 5,
        status: InvoiceStatus.UNPAID,
        items: [1, 2, 3],
      });
      expect(result.success).toBe(true);
    });
  });
});
