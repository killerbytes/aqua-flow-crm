import { describe, it, expect } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { Customer, Order, ProductInventory, User } from "../src/backend/models";

describe("Database Seeder & Clean Schema Sync", () => {
  it("should execute seedDatabase without throwing pg_type or constraint errors", async () => {
    await expect(seedDatabase({ isTest: true, force: true })).resolves.not.toThrow();
  });

  it("should populate User, Customer, ProductInventory, and Order records", async () => {
    const userCount = await User.count();
    const customerCount = await Customer.count();
    const productCount = await ProductInventory.count();
    const orderCount = await Order.count();

    expect(userCount).toBeGreaterThan(0);
    expect(customerCount).toBeGreaterThan(0);
    expect(productCount).toBeGreaterThan(0);
    expect(orderCount).toBeGreaterThan(0);
  });
});
