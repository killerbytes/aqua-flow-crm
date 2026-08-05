import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase } from "../src/backend/db/database";
import { seedDatabase } from "../src/backend/db/seed";
import { OrderService } from "../src/backend/services/order.service";
import { OrderStatus, PaymentStatus } from "../src/lib/definitions";

describe("OrderService getAll & getSummary Query Filters", () => {
  beforeAll(async () => {
    await initDatabase();
    await seedDatabase({ clean: true, testCount: 5 });
  });

  it("should query orders and compute summary metrics without TypeScript or runtime errors", async () => {
    const now = Date.now();
    const startDate = String(now - 7 * 24 * 60 * 60 * 1000);
    const endDate = String(now + 7 * 24 * 60 * 60 * 1000);

    const result = await OrderService.getAll({
      page: 1,
      limit: 10,
      query: {
        startDate,
        endDate,
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

    expect(result).toBeDefined();
    expect(result.rows).toBeInstanceOf(Array);
    expect(result.pagination).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.totalAmount).toHaveProperty("label", "Total Amount");
    expect(result.summary.pendingOrders).toHaveProperty("label", "Pending Orders");
    expect(result.summary.cancelledOrders).toHaveProperty("label", "Cancelled Orders");
    expect(result.summary.unpaidOrders).toHaveProperty("label", "Unpaid Orders");
  });
});
