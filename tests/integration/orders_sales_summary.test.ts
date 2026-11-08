import { beforeAll, describe, expect, it } from "vitest";
import { Order } from "../../src/backend/models";
import { OrderService } from "../../src/backend/services/order.service";
import { OrderStatus, PaymentStatus } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;
const CUSTOMER_ID = 8;

// A week in September 2026 that seed data (all July) never touches.
const RANGE = {
  startDate: String(new Date("2026-09-07T04:00:00Z").getTime()),
  endDate: String(new Date("2026-09-13T04:00:00Z").getTime()),
};

const placeOrder = async (createdAt: string, deliveredAt: string | null) => {
  const order = (await OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      createdAt,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  ))!;
  if (deliveredAt) {
    await Order.update(
      { status: OrderStatus.DELIVERED, deliveredAt },
      { where: { orderId: order.orderId } },
    );
  }
  return order;
};

const summaryFor = async (query: object) =>
  (await OrderService.getAll({ query }) as any).summary;

describe("Integration - Orders Page Sales Summary", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should count sales by delivery date within the selected range", async () => {
    // Placed before the range, delivered inside it: counts.
    const deliveredInRange = await placeOrder("2026-09-05T02:00:00Z", "2026-09-08T02:00:00Z");
    // Placed inside the range, delivered after it: doesn't count yet.
    await placeOrder("2026-09-12T02:00:00Z", "2026-09-15T02:00:00Z");
    // Placed inside the range, still pending: doesn't count.
    await placeOrder("2026-09-10T02:00:00Z", null);

    const summary = await summaryFor(RANGE);

    expect(summary.totalAmount.label).toBe("Delivered Sales");
    expect(Number(summary.totalAmount.value)).toBeCloseTo(
      deliveredInRange.totalAmount,
      2,
    );
  });

  it("should keep the other figures on the list's order-date filter", async () => {
    const summary = await summaryFor(RANGE);
    const pendingPlacedInRange = 1;

    expect(summary.pendingOrders.value).toBe(pendingPlacedInRange);
  });

  it("should not count cancelled orders as unpaid", async () => {
    const before = (await summaryFor(RANGE)).unpaidOrders.value;

    const cancelled = await placeOrder("2026-09-11T02:00:00Z", null);
    await Order.update(
      { status: OrderStatus.CANCELLED },
      { where: { orderId: cancelled.orderId } },
    );

    const summary = await summaryFor(RANGE);
    expect(summary.cancelledOrders.value).toBe(1);
    expect(summary.unpaidOrders.value).toBe(before);
    expect(
      (await summaryFor({ ...RANGE, status: OrderStatus.CANCELLED }))
        .unpaidOrders.value,
    ).toBe(0);
  });

  it("should count every delivered order when no range is selected", async () => {
    const summary = await summaryFor({});
    const expected = await Order.sum("totalAmount", {
      where: { status: OrderStatus.DELIVERED },
    });

    expect(Number(summary.totalAmount.value)).toBeCloseTo(Number(expected), 2);
  });
});
