import { describe, it, expect, beforeAll } from "vitest";
import { generateSeedData, seedDatabase } from "../src/backend/db/seed";
import { Customer, ProductInventory, Order, OrderDetail, sequelize } from "../src/backend/models";

describe("Seed Data Generator & Database Seeder", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  it("should generate seed data with 3 products, 10 customers, and 50 orders", () => {
    const data = generateSeedData(refDate);

    expect(data.products).toHaveLength(3);
    expect(data.customers).toHaveLength(10);
    expect(data.orders).toHaveLength(50);
  });

  it("should distribute the 50 orders over a 1-month (30-day) time window", () => {
    const data = generateSeedData(refDate);
    const orderDates = data.orders.map((o) => new Date(o.createdAt).getTime());

    const minDate = Math.min(...orderDates);
    const maxDate = Math.max(...orderDates);

    const diffInDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    // Should span close to 30 days (e.g. between 25 and 30 days range)
    expect(diffInDays).toBeGreaterThanOrEqual(25);
    expect(diffInDays).toBeLessThanOrEqual(30.5);
  });

  it("should maintain correct financial total_amount for every order and detail", () => {
    const data = generateSeedData(refDate);

    for (const order of data.orders) {
      const calculatedTotal = order.details.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      expect(order.totalAmount).toBeCloseTo(calculatedTotal, 2);
    }
  });

  it("should execute seedDatabase successfully and populate DB models", async () => {
    // Perform seeding
    await seedDatabase({ isTest: true, refDate });

    const productsCount = await ProductInventory.count();
    const customersCount = await Customer.count();
    const ordersCount = await Order.count();
    const detailsCount = await OrderDetail.count();

    expect(productsCount).toBe(3);
    expect(customersCount).toBe(10);
    expect(ordersCount).toBe(50);
    expect(detailsCount).toBeGreaterThanOrEqual(50);
  });
});
