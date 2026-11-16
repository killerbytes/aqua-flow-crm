import { beforeAll, describe, expect, it } from "vitest";
import { InvoiceService, OrderService } from "../../src/backend/services";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { toCents } from "../../src/lib/money";
import { setupTestDatabase } from "../helpers/db.setup";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** A delivered, unpaid order for `quantity` of product 1, and its invoice. */
const invoiceFor = async (customerId: number, quantity: number) => {
  const order = await OrderService.create(
    {
      customerId,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity, discount: 0 }],
    },
    1,
  );
  const invoice = await InvoiceService.create(
    {
      customerId,
      dateIssued: new Date(),
      dueDate: new Date(Date.now() + WEEK),
      status: InvoiceStatus.UNPAID,
      items: [order.orderId],
    },
    1,
  );
  return { order, invoice };
};

const pay = (invoiceId: number, paymentAmount: number, loggedBy = 1) =>
  InvoiceService.payInvoice(
    { invoiceId, paymentAmount, paymentMethod: PaymentMethod.CASH },
    loggedBy,
  );

// What an invoice refuses (overpayment, paying twice, cancelled or paid orders)
// is in billing_integrity.test.ts.
describe("Integration - Invoice Service & Workflows", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should total the orders it bills", async () => {
    const { order, invoice } = await invoiceFor(1, 2);

    expect(invoice.customerId).toBe(1);
    expect(invoice.status).toBe(InvoiceStatus.UNPAID);
    expect(invoice.amount).toBe(order.totalAmount);
    expect(invoice.amount).toBeGreaterThan(0);
  });

  it("should list the invoice's orders and customer when read back", async () => {
    const { order, invoice } = await invoiceFor(1, 1);

    const found = await InvoiceService.get(invoice.invoiceId);

    expect(found?.customer?.customerId).toBe(1);
    expect(found?.invoiceDetails?.map((d) => d.orderId)).toEqual([
      order.orderId,
    ]);
  });

  it("should mark the invoice and its orders paid when paid in full", async () => {
    const { order, invoice } = await invoiceFor(1, 1);

    const paid = await pay(invoice.invoiceId, invoice.amount);

    expect(paid.status).toBe(InvoiceStatus.PAID);
    expect(paid.paymentDate).toBeInstanceOf(Date);
    expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(
      PaymentStatus.PAID,
    );
  });

  it("should stay partly paid, with its orders unpaid, until the balance is cleared", async () => {
    const { order, invoice } = await invoiceFor(1, 2);
    const half = invoice.amount / 2;

    const partial = await pay(invoice.invoiceId, half);
    expect(partial.status).toBe(InvoiceStatus.PARTIAL);
    expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(
      PaymentStatus.UNPAID,
    );

    const settled = await pay(invoice.invoiceId, invoice.amount - half);
    expect(settled.status).toBe(InvoiceStatus.PAID);
    expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(
      PaymentStatus.PAID,
    );
  });

  it("should keep each payment with its amount, method, and who took it", async () => {
    const { invoice } = await invoiceFor(1, 2);
    const half = invoice.amount / 2;
    await pay(invoice.invoiceId, half, 1);
    await pay(invoice.invoiceId, invoice.amount - half, 2);

    const payments = await InvoiceService.getPayments(invoice.invoiceId);

    expect(payments.map((p) => p.paymentAmount)).toEqual(
      expect.arrayContaining([half, invoice.amount - half]),
    );
    expect(payments).toHaveLength(2);
    expect(payments.map((p) => p.loggedBy).sort()).toEqual([1, 2]);
    expect(payments.every((p) => p.paymentMethod === PaymentMethod.CASH)).toBe(
      true,
    );
  });

  it("should raise the unpaid total by exactly what is still owed", async () => {
    const before = (await InvoiceService.getAll({})).summary;

    const { invoice } = await invoiceFor(2, 2);
    const half = invoice.amount / 2;
    await pay(invoice.invoiceId, half);

    const after = (await InvoiceService.getAll({})).summary;

    expect(
      toCents(after.totalUnpaid.value) - toCents(before.totalUnpaid.value),
    ).toBe(toCents(invoice.amount - half));
    expect(after.partialOrders.value).toBe(before.partialOrders.value + 1);
  });

  it("should filter the list by customer and by status", async () => {
    const { invoice } = await invoiceFor(3, 1);
    await pay(invoice.invoiceId, invoice.amount);
    await invoiceFor(3, 1);

    const all = await InvoiceService.getAll({ query: { customerId: 3 } });
    const paid = await InvoiceService.getAll({
      query: { customerId: 3, status: InvoiceStatus.PAID },
    });

    expect(all.rows.map((r) => r.customerId)).toEqual([3, 3]);
    expect(all.pagination.total).toBe(2);
    expect(paid.rows.map((r) => r.invoiceId)).toEqual([invoice.invoiceId]);
  });
});
