import { describe, expect, it } from "vitest";
import { generateSeedData } from "../../src/backend/db/seed";
import {
  Customer,
  Order,
  OrderDetail,
  ProductInventory,
} from "../../src/backend/models";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Database Models & Seeder", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  it("should generate seed data with 3 products, 10 customers, and orders", () => {
    const data = generateSeedData(refDate);

    expect(data.products).toHaveLength(3);
    expect(data.customers).toHaveLength(10);
    expect(data.orders.length).toBeGreaterThanOrEqual(50);
  });

  it("should distribute generated orders over a 1-month time window", () => {
    const data = generateSeedData(refDate);
    const orderDates = data.orders.map((o) => new Date(o.createdAt).getTime());

    const minDate = Math.min(...orderDates);
    const maxDate = Math.max(...orderDates);
    const diffInDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    expect(diffInDays).toBeGreaterThanOrEqual(25);
    expect(diffInDays).toBeLessThanOrEqual(30.5);
  });

  it("should execute seedDatabase successfully and populate DB models", async () => {
    await setupTestDatabase(refDate);

    const productsCount = await ProductInventory.count();
    const customersCount = await Customer.count();
    const ordersCount = await Order.count();
    const detailsCount = await OrderDetail.count();

    expect(productsCount).toBe(3);
    expect(customersCount).toBe(10);
    expect(ordersCount).toBeGreaterThanOrEqual(50);
    expect(detailsCount).toBeGreaterThanOrEqual(50);
  });
});
