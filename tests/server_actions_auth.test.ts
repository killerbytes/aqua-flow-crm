import { describe, expect, it, vi, beforeAll } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { getCustomersAction } from "../src/backend/actions/customer.actions";
import { createProductAction } from "../src/backend/actions/product.actions";
import { createOrderAction } from "../src/backend/actions/order.actions";
import { logEquipmentAction } from "../src/backend/actions/equipment.actions";
import { createUserAction } from "../src/backend/actions/auth.actions";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Server Actions Strict Auth Guard", () => {
  beforeAll(async () => {
    await seedDatabase({ isTest: true });
  });

  it("should throw 'User not authenticated' for unauthenticated customer actions", async () => {
    await expect(getCustomersAction()).rejects.toThrow("User not authenticated");
  });

  it("should throw 'User not authenticated' for unauthenticated product actions", async () => {
    await expect(createProductAction({ name: "Test Product", unitPrice: 10 })).rejects.toThrow("User not authenticated");
  });

  it("should throw 'User not authenticated' for unauthenticated order actions", async () => {
    await expect(createOrderAction({ customerId: 1, items: [] })).rejects.toThrow("User not authenticated");
  });

  it("should throw 'User not authenticated' for unauthenticated equipment actions", async () => {
    await expect(logEquipmentAction({ customerId: 1, productId: 1, actionType: "ISSUE", quantity: 1 })).rejects.toThrow("User not authenticated");
  });

  it("should throw 'User not authenticated' for unauthenticated user creation actions", async () => {
    await expect(createUserAction({ name: "Test User" })).rejects.toThrow("User not authenticated");
  });
});
