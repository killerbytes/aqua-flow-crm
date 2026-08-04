import { beforeAll, describe, expect, it, vi } from "vitest";
import { loginAction } from "../src/backend/actions/auth.actions";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "../src/backend/actions/customer.actions";
import { logEquipmentAction } from "../src/backend/actions/equipment.actions";
import {
  createOrderAction,
  deleteOrderAction,
  updateOrderStatusAction,
} from "../src/backend/actions/order.actions";
import {
  createProductAction,
  updateProductAction,
} from "../src/backend/actions/product.actions";
import { seedDatabase } from "../src/backend/db/seed";
import { CustomerStatus } from "../src/lib/definitions";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock getAuthContext for server actions testing
vi.mock("../src/backend/auth/context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/backend/auth/context")>();
  return {
    ...actual,
    getAuthContext: vi.fn().mockResolvedValue({
      user: {
        userId: 1,
        name: "Admin User",
        username: "admin@aquaflow.com",
        role: "ADMIN",
      },
      currentUser: {
        userId: 1,
        name: "Admin User",
        username: "admin@aquaflow.com",
        role: "ADMIN",
      },
    }),
  };
});

describe("Next.js Server Actions Unit Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should authenticate via loginAction", async () => {
    const result = await loginAction("admin@test.com", "pass");
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe("admin@test.com");
  });

  it("should execute create, update, delete customer actions", async () => {
    const created = await createCustomerAction({
      name: "Server Action Customer",
      address: "456 Action St",
      phone: "09998887777",
      status: CustomerStatus.ACTIVE,
    });

    expect(created.customerId).toBeDefined();
    expect(created.name).toBe("Server Action Customer");

    const updated = await updateCustomerAction(created.customerId, {
      name: "Updated Action Customer",
      address: "Updated 456 Action St",
      phone: "09998887777",
      status: CustomerStatus.ACTIVE,
    });
    expect(updated.name).toBe("Updated Action Customer");
    expect(updated.address).toBe("Updated 456 Action St");
    expect(updated.phone).toBe("09998887777");
    expect(updated.status).toBe(CustomerStatus.ACTIVE);

    const deleted = await deleteCustomerAction(created.customerId);
    expect(deleted).toBe(true);
  });

  it("should execute product server actions", async () => {
    const product = await createProductAction({
      name: "Action Gallon 5L",
      stockInStation: 100,
      unitPrice: 45.0,
    });

    expect(product.productId).toBeDefined();

    const updated = await updateProductAction(product.productId, {
      unitPrice: 50.0,
    });
    expect(updated.unitPrice).toBe(50.0);
  });

  it("should execute order server actions", async () => {
    const order = await createOrderAction({
      customerId: 1,
      status: "PENDING",
      paymentStatus: "UNPAID",
      items: [{ productId: 1, quantity: 5, unitPrice: 50.0 }],
    });

    expect(order.orderId).toBeDefined();
    expect(order.totalAmount).toBe(225.0);

    const updated = await updateOrderStatusAction(order.orderId, "COMPLETED");
    expect(updated.status).toBe("COMPLETED");

    const deleted = await deleteOrderAction(order.orderId);
    expect(deleted).toBe(true);
  });

  it("should execute logEquipmentAction", async () => {
    const log = await logEquipmentAction({
      customerId: 1,
      productId: 1,
      actionType: "ISSUE",
      quantity: 3,
      notes: "Issued 3 containers",
    });

    expect(log.logId).toBeDefined();
    expect(log.quantity).toBe(3);
  });
});
