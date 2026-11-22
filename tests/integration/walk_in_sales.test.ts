import { beforeAll, describe, expect, it } from "vitest";
import { Order, OrderDetail } from "../../src/backend/models";
import { OrderService } from "../../src/backend/services";
import { WALK_IN_CUSTOMER_NAME } from "../../src/backend/services/customer.service";
import {
  FinanceReportService,
  parseDateRange,
  WALK_IN_SALES_LINE,
} from "../../src/backend/services/finance-report.service";
import { businessDateKey, startOfBusinessDay } from "../../src/lib/business-time";
import { OrderStatus, PaymentMethod, PaymentStatus } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;

const daysAgo = (days: number) =>
  businessDateKey(startOfBusinessDay(new Date(), -days));

const record = (input: unknown) => OrderService.recordWalkInSale(input, USER_ID);

describe("Integration - Walk-in Sales", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should record the total as a delivered order paid in cash, with no items", async () => {
    const before = Date.now();
    const sale = (await record({ amount: 1250.5 }))!;

    expect(sale.customer?.name).toBe(WALK_IN_CUSTOMER_NAME);
    expect(sale.totalAmount).toBe(1250.5);
    expect(sale.surcharge).toBe(0);
    expect(sale.status).toBe(OrderStatus.DELIVERED);
    expect(sale.paymentStatus).toBe(PaymentStatus.PAID);
    expect(sale.paymentMethod).toBe(PaymentMethod.CASH);
    expect(sale.deliveredBy).toBe(USER_ID);
    expect(new Date(sale.createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await OrderDetail.count({ where: { orderId: sale.orderId } })).toBe(0);

    const payments = sale.orderPayments ?? [];
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      amount: 1250.5,
      paymentMethod: PaymentMethod.CASH,
      loggedBy: USER_ID,
      reversedAt: null,
    });
  });

  it("should allow more than one entry on the same day", async () => {
    const day = daysAgo(2);
    const first = (await record({ amount: 300, createdAt: day }))!;
    const second = (await record({ amount: 450, createdAt: day }))!;

    expect(second.orderId).not.toBe(first.orderId);
    expect(businessDateKey(new Date(first.createdAt))).toBe(day);
    expect(businessDateKey(new Date(second.createdAt))).toBe(day);
  });

  it("should date the sale, its delivery, and its payment on the day chosen", async () => {
    const day = daysAgo(5);
    const sale = (await record({ amount: 800, createdAt: day }))!;

    expect(businessDateKey(new Date(sale.createdAt))).toBe(day);
    expect(new Date(sale.deliveredAt!).getTime()).toBe(new Date(sale.createdAt).getTime());
    expect(new Date(sale.orderPayments![0].paidAt).getTime()).toBe(
      new Date(sale.createdAt).getTime(),
    );
  });

  it("should round the amount to the centavo", async () => {
    const sale = (await record({ amount: 99.999 }))!;
    expect(sale.totalAmount).toBe(100);
  });

  it("should refuse a missing, zero, or negative amount", async () => {
    const before = await Order.count();

    await expect(record({})).rejects.toThrow();
    await expect(record({ amount: 0 })).rejects.toThrow();
    await expect(record({ amount: -50 })).rejects.toThrow();
    await expect(record({ amount: 0.001 })).rejects.toThrow("Enter the total sales");
    expect(await Order.count()).toBe(before);
  });

  it("should follow the order backdating rules", async () => {
    const tomorrow = businessDateKey(new Date(Date.now() + 86400000));

    await expect(record({ amount: 100, createdAt: tomorrow })).rejects.toThrow(
      "Order date can't be in the future",
    );
    await expect(record({ amount: 100, createdAt: daysAgo(31) })).rejects.toThrow(
      "Order date can't be more than 30 days ago",
    );
    const oldest = (await record({ amount: 100, createdAt: daysAgo(30) }))!;
    expect(businessDateKey(new Date(oldest.createdAt))).toBe(daysAgo(30));
  });

  it("should be voided by a manager, reversing its cash payment", async () => {
    const sale = (await record({ amount: 600 }))!;

    await OrderService.voidOrder(sale.orderId, { reason: "Wrong total" }, USER_ID);

    const voided = (await OrderService.get(sale.orderId))!;
    expect(voided.status).toBe(OrderStatus.CANCELLED);
    expect(voided.voidReason).toBe("Wrong total");
    expect(voided.paymentStatus).toBe(PaymentStatus.UNPAID);
    expect(voided.orderPayments![0].reversedAt).toBeTruthy();
  });

  it("should refuse a cashier voiding it, as it is already paid", async () => {
    const sale = (await record({ amount: 600 }))!;

    await expect(
      OrderService.voidOrder(sale.orderId, { reason: "Wrong total" }, USER_ID, {
        pendingUnpaidOnly: true,
      }),
    ).rejects.toThrow("Only a manager can void");
  });

  it("should show on the Sales report as its own line, adding up to the sales", async () => {
    const day = daysAgo(10);
    const range = parseDateRange({ from: day, to: day });
    const before = await FinanceReportService.getSales(range);
    const walkInBefore =
      before.products.find((p) => p.productName === WALK_IN_SALES_LINE)?.sales ?? 0;

    await record({ amount: 1500, createdAt: day });
    const voided = (await record({ amount: 999, createdAt: day }))!;
    await OrderService.voidOrder(voided.orderId, { reason: "Entered twice" }, USER_ID);

    const report = await FinanceReportService.getSales(range);
    const line = report.products.find((p) => p.productName === WALK_IN_SALES_LINE);
    expect(line).toMatchObject({ units: null, sales: walkInBefore + 1500 });
    expect(report.periodTotal.sales).toBe(before.periodTotal.sales + 1500);
    expect(report.periodTotal.units).toBe(before.periodTotal.units);
    expect(report.productTotal.sales).toBe(report.periodTotal.sales);
  });
});
