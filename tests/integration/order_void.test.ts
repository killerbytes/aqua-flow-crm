import { beforeAll, describe, expect, it } from "vitest";
import { InvoiceService, OrderService } from "../../src/backend/services";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const CUSTOMER_ID = 6;
const USER_ID = 1;
const REASON = "Customer changed their mind";

const newOrder = async (status: string = OrderStatus.PENDING) =>
  (await OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  ))!;

const voidOrder = (orderId: number, reason = REASON) =>
  OrderService.voidOrder(orderId, { reason }, USER_ID);

describe("Integration - Voiding Orders", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it.each([
    OrderStatus.PENDING,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ])("should void a %s order and record why, who, and when", async (status) => {
    const order = await newOrder(status);
    const before = Date.now();

    await voidOrder(order.orderId);

    const voided = (await OrderService.get(order.orderId)) as any;
    expect(voided.status).toBe(OrderStatus.CANCELLED);
    expect(voided.voidReason).toBe(REASON);
    expect(voided.voidedBy).toBe(USER_ID);
    expect(voided.voidedByUser?.userId).toBe(USER_ID);
    expect(new Date(voided.voidedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("should reverse the payment of a paid order with the void reason", async () => {
    const order = await newOrder();
    await OrderService.makePayment(
      { paymentMethod: PaymentMethod.CASH },
      order.orderId,
      USER_ID,
    );

    await voidOrder(order.orderId);

    const voided = (await OrderService.get(order.orderId)) as any;
    expect(voided.paymentStatus).toBe(PaymentStatus.UNPAID);
    expect(voided.paymentMethod).toBeNull();
    expect(voided.orderPayments).toHaveLength(1);
    expect(voided.orderPayments[0].reversedAt).not.toBeNull();
    expect(voided.orderPayments[0].reversedBy).toBe(USER_ID);
    expect(voided.orderPayments[0].reversalReason).toBe(REASON);
  });

  it("should need a reason", async () => {
    const order = await newOrder();

    await expect(voidOrder(order.orderId, "  ")).rejects.toThrow();
    expect((await OrderService.get(order.orderId))?.status).toBe(OrderStatus.PENDING);
  });

  it("should refuse an order that is already cancelled", async () => {
    const order = await newOrder();
    await voidOrder(order.orderId);

    await expect(voidOrder(order.orderId, "Second try")).rejects.toThrow(
      /already cancelled/,
    );
    expect((await OrderService.get(order.orderId))?.voidReason).toBe(REASON);
  });

  it("should refuse an order on an invoice, until the invoice is voided", async () => {
    const order = await newOrder(OrderStatus.DELIVERED);
    const invoice = await InvoiceService.create(
      { customerId: CUSTOMER_ID, status: InvoiceStatus.UNPAID, items: [order.orderId] },
      USER_ID,
    );

    await expect(voidOrder(order.orderId)).rejects.toThrow(/on an invoice/);
    expect((await OrderService.get(order.orderId))?.status).toBe(OrderStatus.DELIVERED);

    await InvoiceService.voidInvoice(invoice.invoiceId, { reason: "Wrong orders" }, USER_ID);
    await voidOrder(order.orderId);
    expect((await OrderService.get(order.orderId))?.status).toBe(OrderStatus.CANCELLED);
  });
});
