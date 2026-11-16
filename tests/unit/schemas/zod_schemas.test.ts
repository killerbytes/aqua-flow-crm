import { describe, expect, it } from "vitest";
import {
  AdjustmentSchema,
  ChangePasswordSchema,
  CustomerSchema,
  EquipmentLogSchema,
  InvoicePaymentSchema,
  InvoiceSchema,
  LoginSchema,
  OrderSchema,
  OrderUpdateSchema,
  PaymentSchema,
  ProductDetailsSchema,
  ProductInventorySchema,
  ReversePaymentSchema,
  SpecialPricingSchema,
  UserFormSchema,
  UserFormUpdateSchema,
  UserSchema,
  VoidInvoiceSchema,
  VoidOrderSchema,
} from "../../../src/backend/schemas/zodSchemas";
import {
  CustomerStatus,
  EquipmentActionType,
  InventoryAdjustmentType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../../src/lib/definitions";

const accepts = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe("Unit - Zod Validation Schemas", () => {
  describe("CustomerSchema", () => {
    const customer = { name: "John Doe", address: "123 Main Street" };

    it("should accept a complete customer", () => {
      expect(
        accepts(CustomerSchema, {
          ...customer,
          phone: "09171234567",
          status: CustomerStatus.ACTIVE,
        }),
      ).toBe(true);
    });

    it("should need a name of 2 characters and an address of 5", () => {
      expect(accepts(CustomerSchema, { ...customer, name: "A" })).toBe(false);
      expect(accepts(CustomerSchema, { ...customer, address: "1 St" })).toBe(
        false,
      );
    });

    it.each([
      "09171234567",
      "+639171234567",
      "0917 123 4567",
      "0917-123-4567",
      "+63 917 123 4567",
    ])("should accept the mobile number %s", (phone) => {
      expect(accepts(CustomerSchema, { ...customer, phone })).toBe(true);
    });

    it.each([
      ["too short", "12345"],
      ["a landline", "028123456789"],
      ["not starting with 09", "08171234567"],
      ["one digit over", "091712345678"],
      ["letters", "0917ABC4567"],
    ])("should refuse a mobile number that is %s", (_, phone) => {
      expect(accepts(CustomerSchema, { ...customer, phone })).toBe(false);
    });

    it("should let the phone be left out", () => {
      for (const phone of ["", null, undefined]) {
        expect(accepts(CustomerSchema, { ...customer, phone })).toBe(true);
      }
    });

    it("should refuse a status that doesn't exist", () => {
      expect(accepts(CustomerSchema, { ...customer, status: "ARCHIVED" })).toBe(
        false,
      );
    });
  });

  describe("OrderSchema", () => {
    const item = { productId: 1, quantity: 5 };
    const order = {
      customerId: 1,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [item],
    };

    it("should accept a valid order and default each discount to zero", () => {
      const parsed = OrderSchema.parse(order);
      expect(parsed.items[0].discount).toBe(0);
    });

    it("should refuse an order without items", () => {
      expect(accepts(OrderSchema, { ...order, items: [] })).toBe(false);
    });

    it.each([
      ["a zero quantity", { ...item, quantity: 0 }],
      ["a negative quantity", { ...item, quantity: -1 }],
      ["a fractional quantity", { ...item, quantity: 1.5 }],
      ["a negative discount", { ...item, discount: -1 }],
      ["no product", { ...item, productId: 0 }],
    ])("should refuse an item with %s", (_, bad) => {
      expect(accepts(OrderSchema, { ...order, items: [bad] })).toBe(false);
    });

    it("should allow a surcharge of zero or more, as a number", () => {
      expect(accepts(OrderSchema, { ...order, surcharge: 0 })).toBe(true);
      expect(accepts(OrderSchema, { ...order, surcharge: 25.5 })).toBe(true);
      expect(accepts(OrderSchema, { ...order, surcharge: -1 })).toBe(false);
      expect(accepts(OrderSchema, { ...order, surcharge: "25" })).toBe(false);
    });

    it("should refuse a status or payment status that doesn't exist", () => {
      expect(accepts(OrderSchema, { ...order, status: "SHIPPED" })).toBe(false);
      expect(accepts(OrderSchema, { ...order, paymentStatus: "FREE" })).toBe(
        false,
      );
    });

    it("should keep only items and surcharge when editing an order", () => {
      const parsed = OrderUpdateSchema.parse({
        ...order,
        status: OrderStatus.DELIVERED,
        surcharge: 10,
      });
      expect(Object.keys(parsed).sort()).toEqual(["items", "surcharge"]);
    });
  });

  describe("PaymentSchema", () => {
    it("should accept a payment method with optional notes", () => {
      expect(
        accepts(PaymentSchema, {
          paymentMethod: PaymentMethod.CASH,
          paymentNotes: "Paid upon delivery",
        }),
      ).toBe(true);
    });

    it("should refuse a missing or unknown payment method", () => {
      expect(accepts(PaymentSchema, {})).toBe(false);
      expect(accepts(PaymentSchema, { paymentMethod: "BITCOIN" })).toBe(false);
    });
  });

  describe("ProductInventorySchema", () => {
    const product = { name: "5-Gallon Container", unitPrice: 200 };

    it("should accept a product and read a price typed as text", () => {
      expect(ProductInventorySchema.parse({ ...product, unitPrice: "35.50" }).unitPrice).toBe(35.5);
    });

    it("should refuse a negative price or a one-letter name", () => {
      expect(accepts(ProductInventorySchema, { ...product, unitPrice: -10 })).toBe(false);
      expect(accepts(ProductInventorySchema, { ...product, name: "J" })).toBe(false);
    });

    it("should take a low stock threshold of a whole number, zero, or none", () => {
      for (const lowStockThreshold of [0, 10, null, undefined]) {
        expect(accepts(ProductInventorySchema, { ...product, lowStockThreshold })).toBe(true);
      }
      for (const lowStockThreshold of [-1, 2.5, "10"]) {
        expect(accepts(ProductInventorySchema, { ...product, lowStockThreshold })).toBe(false);
      }
    });

    it("should leave stock out of what a product form can change", () => {
      const parsed = ProductDetailsSchema.parse({
        ...product,
        stockInStation: 50,
        stockWithCustomers: 5,
        stockDamaged: 1,
        stockLost: 1,
      });
      expect(Object.keys(parsed).sort()).toEqual(["name", "unitPrice"]);
    });
  });

  describe("AdjustmentSchema", () => {
    const adjustment = {
      productId: 1,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 10,
    };

    it("should accept a whole, positive quantity", () => {
      expect(accepts(AdjustmentSchema, adjustment)).toBe(true);
    });

    it.each([0, -5, 2.5, "10"])("should refuse a quantity of %j", (quantity) => {
      expect(accepts(AdjustmentSchema, { ...adjustment, quantity })).toBe(false);
    });

    it("should refuse an unknown adjustment type or no product", () => {
      expect(accepts(AdjustmentSchema, { ...adjustment, adjustmentType: "GIFT" })).toBe(false);
      expect(accepts(AdjustmentSchema, { ...adjustment, productId: 0 })).toBe(false);
    });
  });

  describe("EquipmentLogSchema", () => {
    const log = {
      customerId: 1,
      productId: 2,
      actionType: EquipmentActionType.ISSUE,
      quantity: 3,
    };

    it("should accept a movement of whole units", () => {
      expect(accepts(EquipmentLogSchema, log)).toBe(true);
    });

    it.each([0, -1, 1.5])("should refuse a quantity of %s", (quantity) => {
      expect(accepts(EquipmentLogSchema, { ...log, quantity })).toBe(false);
    });

    it("should refuse an unknown action", () => {
      expect(accepts(EquipmentLogSchema, { ...log, actionType: "STOLEN" })).toBe(false);
    });
  });

  describe("SpecialPricingSchema", () => {
    const pricing = { customerId: 1, productId: 1, discountAmount: 5 };

    it("should accept a discount, reading one typed as text", () => {
      expect(SpecialPricingSchema.parse({ ...pricing, discountAmount: "2.50" }).discountAmount).toBe(2.5);
    });

    it.each([0, -5, "abc"])("should refuse a discount of %j", (discountAmount) => {
      expect(accepts(SpecialPricingSchema, { ...pricing, discountAmount })).toBe(false);
    });
  });

  describe("Reasons for voids and reversals", () => {
    const schemas = [
      ["VoidOrderSchema", VoidOrderSchema],
      ["VoidInvoiceSchema", VoidInvoiceSchema],
      ["ReversePaymentSchema", ReversePaymentSchema],
    ] as const;

    it.each(schemas)("%s should trim the reason", (_, schema) => {
      expect(schema.parse({ reason: "  Entered twice  " })).toEqual({
        reason: "Entered twice",
      });
    });

    it.each(schemas)(
      "%s should refuse a blank or too-short reason",
      (_, schema) => {
        for (const reason of ["", "   ", "no", "  ab  ", undefined]) {
          expect(accepts(schema, { reason })).toBe(false);
        }
      },
    );
  });

  describe("Users and passwords", () => {
    const user = {
      name: "Staff Member",
      username: "staff01",
      password: "secretpassword",
      role: UserRole.CASHIER,
    };

    it("should accept a 4-character password and refuse 3, saying so", () => {
      expect(accepts(UserSchema, { ...user, password: "abcd" })).toBe(true);

      const short = UserSchema.safeParse({ ...user, password: "abc" });
      expect(short.error?.flatten().fieldErrors.password?.[0]).toBe(
        "Password must be at least 4 characters",
      );
    });

    it("should refuse a role that doesn't exist", () => {
      expect(accepts(UserSchema, { ...user, role: "OWNER" })).toBe(false);
    });

    it("should need the password confirmed when creating a user", () => {
      expect(accepts(UserFormSchema, { ...user, confirmPassword: user.password })).toBe(true);

      const mismatch = UserFormSchema.safeParse({
        ...user,
        confirmPassword: "differentpassword",
      });
      expect(mismatch.error?.flatten().fieldErrors.confirmPassword).toEqual([
        "Passwords do not match",
      ]);
    });

    it("should not take a password when editing a user", () => {
      const parsed = UserFormUpdateSchema.parse({ ...user, isActive: false });
      expect(parsed).not.toHaveProperty("password");
      expect(parsed.isActive).toBe(false);
    });

    it("should need only matching passwords to change one", () => {
      const change = { password: "newpass1", confirmPassword: "newpass1" };
      expect(accepts(ChangePasswordSchema, change)).toBe(true);
      expect(accepts(ChangePasswordSchema, { ...change, confirmPassword: "other123" })).toBe(false);
      expect(accepts(ChangePasswordSchema, { password: "abc", confirmPassword: "abc" })).toBe(false);
    });

    it("should need a username and a password to log in", () => {
      expect(accepts(LoginSchema, { username: "admin", password: "pass" })).toBe(true);
      expect(accepts(LoginSchema, { username: "admin" })).toBe(false);
      expect(accepts(LoginSchema, { password: "pass" })).toBe(false);
    });
  });

  describe("Invoices", () => {
    const invoice = { customerId: 5, status: InvoiceStatus.UNPAID, items: [1, 2, 3] };
    const payment = {
      invoiceId: 10,
      paymentAmount: 500,
      paymentMethod: PaymentMethod.GCASH,
    };

    it("should accept an invoice for at least one order", () => {
      expect(accepts(InvoiceSchema, invoice)).toBe(true);
      expect(accepts(InvoiceSchema, { ...invoice, items: [] })).toBe(false);
      expect(accepts(InvoiceSchema, { ...invoice, customerId: 0 })).toBe(false);
    });

    it("should accept a payment above zero", () => {
      expect(accepts(InvoicePaymentSchema, payment)).toBe(true);
      expect(accepts(InvoicePaymentSchema, { ...payment, paymentAmount: 0.01 })).toBe(true);
    });

    it.each([0, -100, "500"])("should refuse a payment of %j", (paymentAmount) => {
      expect(accepts(InvoicePaymentSchema, { ...payment, paymentAmount })).toBe(false);
    });

    it("should refuse a payment with no invoice or an unknown method", () => {
      expect(accepts(InvoicePaymentSchema, { ...payment, invoiceId: 0 })).toBe(false);
      expect(accepts(InvoicePaymentSchema, { ...payment, paymentMethod: "CHEQUE" })).toBe(false);
    });
  });
});
