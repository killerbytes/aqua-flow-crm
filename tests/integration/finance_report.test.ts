import { beforeAll, describe, expect, it } from "vitest";
import {
  Customer,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  OrderDetail,
  OrderPayment,
  User,
} from "../../src/backend/models";
import { DashboardService } from "../../src/backend/services/dashboard.service";
import {
  FinanceReportService,
  parseDateRange,
  parseSalesGroup,
  VOID_TYPES,
} from "../../src/backend/services/finance-report.service";
import {
  CustomerStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;
// March 2027, well clear of the seeded data.
const MARCH = parseDateRange({ from: "2027-03-01", to: "2027-03-31" });

const customer = (name: string) =>
  Customer.create({
    name: `FIN ${name}`,
    address: "1 Finance St",
    barangayId: "034903002",
    status: CustomerStatus.ACTIVE,
  });

const order = async (
  customerId: number,
  fields: Partial<{
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    deliveredAt: Date | null;
    createdAt: Date;
    totalAmount: number;
    surcharge: number;
    voidedAt: Date;
    voidReason: string;
  }>,
  lines: { productId: number; quantity: number; unitPrice: number; discount?: number }[] = [],
) => {
  const created = await Order.create({
    customerId,
    createdBy: USER_ID,
    status: OrderStatus.DELIVERED,
    ...fields,
    voidedBy: fields.voidedAt ? USER_ID : null,
  });
  for (const line of lines) {
    await OrderDetail.create({ orderId: created.orderId, discount: 0, ...line });
  }
  return created;
};

const invoice = (
  customerId: number,
  amount: number,
  dueDate: Date | null,
  status: InvoiceStatus = InvoiceStatus.UNPAID,
  extra: Partial<{ voidedAt: Date; voidReason: string }> = {},
) =>
  Invoice.create({
    customerId,
    amount,
    dueDate,
    status,
    dateIssued: new Date("2026-06-01T00:00:00Z"),
    loggedBy: USER_ID,
    ...extra,
    voidedBy: extra.voidedAt ? USER_ID : null,
  });

describe("Integration - Finance Reports", () => {
  let userName: string;

  beforeAll(async () => {
    await setupTestDatabase();
    userName = (await User.findByPk(USER_ID))!.name;
  });

  describe("Sales", () => {
    beforeAll(async () => {
      const shop = await customer("Shop");
      const id = shop.customerId;

      // 9 AM, Mar 1 in Manila: 2 × (25 − 5) + 30, plus a 10 surcharge.
      await order(
        id,
        { deliveredAt: new Date("2027-03-01T01:00:00Z"), totalAmount: 80, surcharge: 10 },
        [
          { productId: 1, quantity: 2, unitPrice: 25, discount: 5 },
          { productId: 2, quantity: 1, unitPrice: 30 },
        ],
      );
      // 12:30 AM, Mar 1 in Manila, though still Feb 28 in UTC.
      await order(id, { deliveredAt: new Date("2027-02-28T16:30:00Z"), totalAmount: 25 }, [
        { productId: 1, quantity: 1, unitPrice: 25 },
      ]);
      // 11:30 PM, Mar 8 in Manila.
      await order(id, { deliveredAt: new Date("2027-03-08T15:30:00Z"), totalAmount: 75 }, [
        { productId: 1, quantity: 3, unitPrice: 25 },
      ]);
      // 12:30 AM, Apr 1 in Manila: outside the range.
      await order(id, { deliveredAt: new Date("2027-03-31T16:30:00Z"), totalAmount: 99 }, [
        { productId: 1, quantity: 9, unitPrice: 11 },
      ]);
      // Delivered, then voided: not a sale.
      const voided = await order(
        id,
        {
          status: OrderStatus.CANCELLED,
          deliveredAt: new Date("2027-03-02T01:00:00Z"),
          totalAmount: 50,
          voidedAt: new Date("2027-03-05T02:00:00Z"),
          voidReason: "Entered twice",
        },
        [{ productId: 1, quantity: 2, unitPrice: 25 }],
      );

      await OrderPayment.create({
        orderId: voided.orderId,
        amount: 80,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2027-03-02T02:00:00Z"),
        loggedBy: USER_ID,
      });
      await OrderPayment.create({
        orderId: voided.orderId,
        amount: 5,
        paymentMethod: null,
        paidAt: new Date("2027-03-02T03:00:00Z"),
        loggedBy: USER_ID,
      });
      await OrderPayment.create({
        orderId: voided.orderId,
        amount: 75,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2027-03-02T04:00:00Z"),
        loggedBy: USER_ID,
        reversedAt: new Date("2027-03-07T02:00:00Z"),
        reversedBy: USER_ID,
        reversalReason: "Wrong customer",
      });

      const billed = await invoice(id, 200, new Date("2027-03-10T00:00:00Z"));
      await InvoicePayment.create({
        invoiceId: billed.invoiceId,
        paymentAmount: 100,
        paymentMethod: PaymentMethod.GCASH,
        paymentDate: new Date("2027-03-03T02:00:00Z"),
        loggedBy: USER_ID,
      });
    });

    it("should total delivered orders by Philippine day", async () => {
      const report = await FinanceReportService.getSales(MARCH, "day");

      expect(report.periods).toHaveLength(31);
      expect(report.periods[0]).toEqual({
        label: "Mon, Mar 1, 2027",
        orders: 2,
        units: 4,
        sales: 105,
      });
      expect(report.periods[7]).toMatchObject({ orders: 1, units: 3, sales: 75 });
      expect(report.periods[1]).toMatchObject({ orders: 0, sales: 0 });
      expect(report.periodTotal).toEqual({
        label: "Total",
        orders: 3,
        units: 7,
        sales: 180,
      });
    });

    it("should group by Monday-to-Sunday week, clipping the last week to the range", async () => {
      const report = await FinanceReportService.getSales(MARCH, "week");

      expect(report.periods.map((p) => p.label)).toEqual([
        "Mar 1 – Mar 7, 2027",
        "Mar 8 – Mar 14, 2027",
        "Mar 15 – Mar 21, 2027",
        "Mar 22 – Mar 28, 2027",
        "Mar 29 – Mar 31, 2027",
      ]);
      expect(report.periods.map((p) => p.sales)).toEqual([105, 75, 0, 0, 0]);
    });

    it("should group by month", async () => {
      const report = await FinanceReportService.getSales(MARCH, "month");
      expect(report.periods).toEqual([
        { label: "March 2027", orders: 3, units: 7, sales: 180 },
      ]);
    });

    it("should total by product, with surcharges on their own line, adding up to the sales", async () => {
      const report = await FinanceReportService.getSales(MARCH);

      expect(report.products.map((p) => [p.units, p.sales])).toEqual([
        [6, 140],
        [1, 30],
        [null, 10],
      ]);
      expect(report.products.at(-1)?.productName).toBe("Surcharges");
      expect(report.productTotal).toMatchObject({ units: 7, sales: 180 });
      expect(report.productTotal.sales).toBe(report.periodTotal.sales);
    });

    it("should total payments that stand by method, from orders and invoices", async () => {
      const report = await FinanceReportService.getSales(MARCH);

      expect(report.collections).toEqual([
        { method: "Cash", payments: 1, fromOrders: 80, fromInvoices: 0, total: 80 },
        { method: "GCash", payments: 1, fromOrders: 0, fromInvoices: 100, total: 100 },
        { method: "Not recorded", payments: 1, fromOrders: 5, fromInvoices: 0, total: 5 },
      ]);
      expect(report.collectionTotal).toEqual({
        method: "Total",
        payments: 3,
        fromOrders: 85,
        fromInvoices: 100,
        total: 185,
      });
    });

    it("should list voids and reversals in the range, newest first", async () => {
      const lender = await customer("Voids");
      const voidedInvoice = await invoice(
        lender.customerId,
        200,
        null,
        InvoiceStatus.VOID,
        { voidedAt: new Date("2027-03-06T02:00:00Z"), voidReason: "Wrong orders" },
      );
      const payment = await InvoicePayment.create({
        invoiceId: voidedInvoice.invoiceId,
        paymentAmount: 40,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date("2027-03-01T02:00:00Z"),
        loggedBy: USER_ID,
      });
      await payment.update({
        reversedAt: new Date("2027-03-08T02:00:00Z"),
        reversedBy: USER_ID,
        reversalReason: "Bounced",
      });
      // Outside the range, and cancelled without a void record: both left out.
      await order(lender.customerId, {
        status: OrderStatus.CANCELLED,
        totalAmount: 10,
        voidedAt: new Date("2027-04-02T02:00:00Z"),
        voidReason: "Later",
      });
      await order(lender.customerId, { status: OrderStatus.CANCELLED, totalAmount: 10 });

      const report = await FinanceReportService.getVoidsAndReversals(MARCH);

      expect(
        report.rows.map((row) => [row.type, row.amount, row.by, row.reason]),
      ).toEqual([
        [VOID_TYPES.INVOICE_PAYMENT_REVERSED, 40, userName, "Bounced"],
        [VOID_TYPES.ORDER_PAYMENT_REVERSED, 75, userName, "Wrong customer"],
        [VOID_TYPES.INVOICE_VOIDED, 200, userName, "Wrong orders"],
        [VOID_TYPES.ORDER_VOIDED, 50, userName, "Entered twice"],
      ]);
      expect(report.rows[2]).toMatchObject({
        reference: `Invoice #${voidedInvoice.invoiceId}`,
        customerName: "FIN Voids",
      });
      expect(report.byType.map((row) => [row.count, row.amount])).toEqual([
        [1, 50],
        [1, 200],
        [1, 75],
        [1, 40],
      ]);
      expect(report.total).toEqual({ type: "Total", count: 4, amount: null });
    });
  });

  describe("Money owed (aging)", () => {
    // Noon, Sep 15 2026 in Manila.
    const NOW = new Date("2026-09-15T04:00:00Z");
    let debtorId: number;

    beforeAll(async () => {
      const debtor = await customer("Debtor");
      debtorId = debtor.customerId;
      await customer("Owes Nothing");

      // Not due yet: 1000, less 300 paid; a reversed 200 doesn't count.
      const notDue = await invoice(debtorId, 1000, new Date("2026-09-20T00:00:00Z"));
      for (const [amount, reversed] of [[300, false], [200, true]] as const) {
        await InvoicePayment.create({
          invoiceId: notDue.invoiceId,
          paymentAmount: amount,
          paymentMethod: PaymentMethod.CASH,
          paymentDate: new Date("2026-09-01T00:00:00Z"),
          loggedBy: USER_ID,
          ...(reversed && { reversedAt: new Date("2026-09-02T00:00:00Z"), reversedBy: USER_ID, reversalReason: "x" }),
        });
      }
      await notDue.update({ status: InvoiceStatus.PARTIAL });

      // Due Aug 1: 45 days past due.
      const overdue = await invoice(debtorId, 500, new Date("2026-08-01T00:00:00Z"));
      await invoice(debtorId, 999, null, InvoiceStatus.VOID);
      await invoice(debtorId, 777, new Date("2026-01-01T00:00:00Z"), InvoiceStatus.PAID);

      const unpaid = { paymentStatus: PaymentStatus.UNPAID };
      // Delivered today, and late yesterday (one day past due), and in May.
      await order(debtorId, { ...unpaid, totalAmount: 120, deliveredAt: new Date("2026-09-15T01:00:00Z") });
      await order(debtorId, { ...unpaid, totalAmount: 80, deliveredAt: new Date("2026-09-14T15:30:00Z") });
      await order(debtorId, { ...unpaid, totalAmount: 60, deliveredAt: new Date("2026-05-01T04:00:00Z") });

      // On the overdue invoice: owed through the invoice, not twice.
      const billed = await order(debtorId, { ...unpaid, totalAmount: 500, deliveredAt: new Date("2026-07-20T00:00:00Z") });
      await InvoiceDetail.create({ invoiceId: overdue.invoiceId, orderId: billed.orderId });

      // Its invoice was voided, so it's unbilled again: 76 days.
      const freed = await order(debtorId, { ...unpaid, totalAmount: 40, deliveredAt: new Date("2026-07-01T04:00:00Z") });
      await InvoiceDetail.create({
        invoiceId: overdue.invoiceId,
        orderId: freed.orderId,
        voidedAt: new Date("2026-07-15T00:00:00Z"),
      });

      // Paid, or not delivered yet: nothing owed.
      await order(debtorId, { paymentStatus: PaymentStatus.PAID, totalAmount: 300, deliveredAt: NOW });
      await order(debtorId, { ...unpaid, status: OrderStatus.PENDING, totalAmount: 300, deliveredAt: null });
    });

    it("should bucket each customer's invoices and unbilled orders by days past due", async () => {
      const { rows } = await FinanceReportService.getReceivablesAging(NOW);
      const debtor = rows.find((row) => row.customerId === debtorId);

      expect(debtor).toEqual({
        customerId: debtorId,
        customerName: "FIN Debtor",
        phone: null,
        openInvoices: 2,
        unbilledOrders: 4,
        current: 820,
        days1to30: 80,
        days31to60: 500,
        days61to90: 40,
        over90: 60,
        total: 1500,
      });
      expect(rows.some((row) => row.customerName === "FIN Owes Nothing")).toBe(false);
    });

    it("should list the biggest debts first, with totals that add up", async () => {
      const { rows, total } = await FinanceReportService.getReceivablesAging(NOW);
      const owed = rows.map((row) => row.total);

      expect(owed).toEqual([...owed].sort((a, b) => b - a));
      const cents = (pick: (row: (typeof rows)[number]) => number) =>
        rows.reduce((sum, row) => sum + Math.round(pick(row) * 100), 0) / 100;
      expect(total.total).toBe(cents((row) => row.total));
      expect(total.days31to60).toBe(cents((row) => row.days31to60));
      expect(total.openInvoices).toBe(rows.reduce((s, r) => s + r.openInvoices, 0));
    });

    it("should match the dashboard's receivables", async () => {
      const [{ total }, receivables] = await Promise.all([
        FinanceReportService.getReceivablesAging(NOW),
        DashboardService.getReceivables(NOW),
      ]);
      expect(total.total).toBe(receivables.total);
    });
  });

  describe("Parameters", () => {
    const NOW = new Date("2026-11-14T04:00:00Z");

    it("should default to this month so far, in Philippine time", () => {
      expect(parseDateRange({}, NOW)).toMatchObject({ from: "2026-11-01", to: "2026-11-14" });
      // 7 AM Nov 1 in Manila is still Oct 31 in UTC.
      expect(parseDateRange({}, new Date("2026-10-31T23:00:00Z"))).toMatchObject({
        from: "2026-11-01",
        to: "2026-11-01",
      });
    });

    it("should cover whole Philippine days", () => {
      const range = parseDateRange({ from: "2026-11-02", to: "2026-11-03" }, NOW);
      expect(range.start.toISOString()).toBe("2026-11-01T16:00:00.000Z");
      expect(range.end.toISOString()).toBe("2026-11-03T16:00:00.000Z");
    });

    it("should ignore dates that don't exist and swap a reversed range", () => {
      expect(parseDateRange({ from: "2026-02-30", to: "nope" }, NOW)).toMatchObject({
        from: "2026-11-01",
        to: "2026-11-14",
      });
      expect(parseDateRange({ from: "2026-11-10", to: "2026-11-03" }, NOW)).toMatchObject({
        from: "2026-11-03",
        to: "2026-11-10",
      });
      expect(parseDateRange({ from: ["2026-11-05", "x"] }, NOW)).toMatchObject({
        from: "2026-11-05",
      });
    });

    it("should group by day unless asked otherwise", () => {
      expect(parseSalesGroup(undefined)).toBe("day");
      expect(parseSalesGroup("year")).toBe("day");
      expect(parseSalesGroup("week")).toBe("week");
      expect(parseSalesGroup(["month"])).toBe("month");
    });
  });
});
