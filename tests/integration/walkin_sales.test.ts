import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase } from "../../src/backend/db/database";
import { User } from "../../src/backend/models";
import { CustomerService } from "../../src/backend/services/customer.service";
import { OrderService } from "../../src/backend/services/order.service";
import { ProductService } from "../../src/backend/services/product.service";
import { OrderStatus, PaymentStatus, UserRole } from "../../src/lib/definitions";

describe("Integration - Consolidated Walk-In Sales Workflow", () => {
  beforeAll(async () => {
    await initDatabase();
    await User.findOrCreate({
      where: { userId: 1 },
      defaults: {
        userId: 1,
        name: "Admin User",
        username: "admin",
        passwordHash: "hashedpassword",
        role: UserRole.ADMIN,
      },
    });
    await ProductService.create({
      name: "5-Gallon Container (Slim)",
      unitPrice: 35,
    });
  });

  it("should retrieve or create the Walk-In / Counter Sales customer", async () => {
    const walkInCustomer = await CustomerService.getOrCreateWalkIn();
    expect(walkInCustomer).toBeDefined();
    expect(walkInCustomer.name).toBe("Walk-In / Counter Sales");
    expect(walkInCustomer.customerId).toBeGreaterThan(0);

    // Calling it again should return the existing customer
    const walkInCustomerAgain = await CustomerService.getOrCreateWalkIn();
    expect(walkInCustomerAgain.customerId).toBe(walkInCustomer.customerId);
  });

  it("should record a consolidated walk-in sale order with DELIVERED status and PAID payment status", async () => {
    const walkInCustomer = await CustomerService.getOrCreateWalkIn();
    const products = await ProductService.getAll();
    expect(products.length).toBeGreaterThan(0);

    const targetProduct = products[0];

    const order = await OrderService.create(
      {
        customerId: walkInCustomer.customerId,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        items: [
          {
            productId: targetProduct.productId,
            quantity: 10,
            unitPrice: Number(targetProduct.unitPrice),
          },
        ],
      },
      1, // createdBy Admin
    );

    expect(order).toBeDefined();
    expect(order.customerId).toBe(walkInCustomer.customerId);
    expect(order.status).toBe(OrderStatus.DELIVERED);
    expect(order.paymentStatus).toBe(PaymentStatus.PAID);
    expect(order.totalAmount).toBe(Number(targetProduct.unitPrice) * 10);
  });
});
