import { beforeAll, describe, expect, it } from "vitest";
import { Customer, Order, ProductInventory } from "../../src/backend/models";
import {
  CustomerService,
  EquipmentService,
  InvoiceService,
} from "../../src/backend/services";
import { DashboardService } from "../../src/backend/services/dashboard.service";
import { OrderService } from "../../src/backend/services/order.service";
import {
  CustomerStatus,
  EquipmentActionType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

// 10:00 on 15 Aug 2026 in Manila (UTC+8). Seed data is all from July.
const NOW = new Date("2026-08-15T02:00:00Z");
const USER_ID = 1;

const newCustomer = async (name: string) =>
  (await CustomerService.create({ name, address: "123 Test Street", phone: "" }))!;

const placeOrder = async (
  customerId: number,
  createdAt: string,
  status: string = OrderStatus.DELIVERED,
  paymentStatus: string = PaymentStatus.UNPAID,
) =>
  (await OrderService.create(
    {
      customerId,
      status,
      paymentStatus,
      createdAt,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  ))!;

describe("Integration - Dashboard", () => {
  let price: number;

  beforeAll(async () => {
    await setupTestDatabase();
    price = (await ProductInventory.findByPk(1))!.unitPrice;
  });

  describe("today's sales", () => {
    it("should count only delivered orders, by Philippine day", async () => {
      const customer = await newCustomer("Sales Day");
      const before = await DashboardService.getSummary(NOW);

      // 00:30 Manila on the 15th, which is still the 14th in UTC.
      await placeOrder(customer.customerId, "2026-08-14T16:30:00Z");
      await placeOrder(customer.customerId, "2026-08-15T01:00:00Z");
      // 23:30 Manila on the 14th, which is the 14th in UTC too.
      await placeOrder(customer.customerId, "2026-08-14T15:30:00Z");
      // Today, but not counted: cancelled, and not yet delivered.
      const cancelled = await placeOrder(customer.customerId, "2026-08-15T01:00:00Z");
      await OrderService.updateStatus(cancelled.orderId, OrderStatus.CANCELLED, { userId: USER_ID });
      await placeOrder(customer.customerId, "2026-08-15T01:00:00Z", OrderStatus.PENDING);

      const after = await DashboardService.getSummary(NOW);

      expect(after.today.orderCount - before.today.orderCount).toBe(2);
      expect(after.today.sales - before.today.sales).toBeCloseTo(price * 2, 2);
    });
  });

  it("should count the delivery queue", async () => {
    const customer = await newCustomer("Queue");
    const before = (await DashboardService.getSummary(NOW)).deliveries;

    await placeOrder(customer.customerId, "2026-08-15T01:00:00Z", OrderStatus.PENDING);
    const out = await placeOrder(customer.customerId, "2026-08-15T01:00:00Z", OrderStatus.PENDING);
    await OrderService.updateStatus(out.orderId, OrderStatus.OUT_FOR_DELIVERY, { userId: USER_ID });

    const after = (await DashboardService.getSummary(NOW)).deliveries;
    expect(after.pending - before.pending).toBe(1);
    expect(after.outForDelivery - before.outForDelivery).toBe(1);
  });

  describe("money owed", () => {
    it("should add unbilled orders and invoice balances, without double counting", async () => {
      const customer = await newCustomer("Owes Money");
      const before = (await DashboardService.getSummary(NOW)).receivables;

      // Unbilled: delivered and unpaid.
      await placeOrder(customer.customerId, "2026-08-10T01:00:00Z");
      // Invoiced and partly paid: counts once, as the invoice balance.
      const invoiced = await placeOrder(customer.customerId, "2026-08-10T01:00:00Z");
      const invoice = await InvoiceService.create(
        {
          customerId: customer.customerId,
          status: InvoiceStatus.UNPAID,
          items: [invoiced.orderId],
          dueDate: "2026-08-20",
        },
        USER_ID,
      );
      await InvoiceService.payInvoice(
        { invoiceId: invoice.invoiceId, paymentAmount: 10, paymentMethod: PaymentMethod.CASH },
        USER_ID,
      );
      // Not owed: paid, pending, and cancelled.
      await placeOrder(customer.customerId, "2026-08-10T01:00:00Z", OrderStatus.DELIVERED, PaymentStatus.PAID);
      await placeOrder(customer.customerId, "2026-08-10T01:00:00Z", OrderStatus.PENDING);

      const after = (await DashboardService.getSummary(NOW)).receivables;

      expect(after.unbilled.count - before.unbilled.count).toBe(1);
      expect(after.unbilled.amount - before.unbilled.amount).toBeCloseTo(price, 2);
      expect(after.openInvoices.count - before.openInvoices.count).toBe(1);
      expect(after.openInvoices.amount - before.openInvoices.amount).toBeCloseTo(price - 10, 2);
      expect(after.total - before.total).toBeCloseTo(price * 2 - 10, 2);
      expect(after.overdueInvoices.count).toBe(before.overdueInvoices.count);
    });

    it("should count invoices past their due date as overdue", async () => {
      const customer = await newCustomer("Overdue");
      const before = (await DashboardService.getSummary(NOW)).receivables;
      const order = await placeOrder(customer.customerId, "2026-08-01T01:00:00Z");
      await InvoiceService.create(
        {
          customerId: customer.customerId,
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
          dueDate: "2026-08-08",
        },
        USER_ID,
      );

      const after = (await DashboardService.getSummary(NOW)).receivables;
      expect(after.overdueInvoices.count - before.overdueInvoices.count).toBe(1);
      expect(after.overdueInvoices.amount - before.overdueInvoices.amount).toBeCloseTo(price, 2);
    });

    it("should drop a voided invoice's balance", async () => {
      const customer = await newCustomer("Voided Balance");
      const order = await placeOrder(customer.customerId, "2026-08-10T01:00:00Z");
      const invoice = await InvoiceService.create(
        { customerId: customer.customerId, status: InvoiceStatus.UNPAID, items: [order.orderId] },
        USER_ID,
      );
      const before = (await DashboardService.getSummary(NOW)).receivables;

      await InvoiceService.voidInvoice(invoice.invoiceId, { reason: "Billed in error" }, USER_ID);

      // The order is owed again as unbilled, so the total doesn't change.
      const after = (await DashboardService.getSummary(NOW)).receivables;
      expect(after.openInvoices.count).toBe(before.openInvoices.count - 1);
      expect(after.unbilled.count).toBe(before.unbilled.count + 1);
      expect(after.total).toBeCloseTo(before.total, 2);
    });
  });

  describe("customers", () => {
    it("should count active customers, not inactive ones or the walk-in account", async () => {
      const before = (await DashboardService.getSummary(NOW)).customers;

      await newCustomer("Active One");
      const inactive = await newCustomer("Inactive One");
      await Customer.update(
        { status: CustomerStatus.INACTIVE },
        { where: { customerId: inactive.customerId } },
      );
      await CustomerService.getOrCreateWalkIn();

      const after = (await DashboardService.getSummary(NOW)).customers;
      expect(after.active - before.active).toBe(1);
    });

    it("should flag customers who ordered before but not in the last 7 days", async () => {
      const before = (await DashboardService.getSummary(NOW)).customers;

      const lapsed = await newCustomer("Lapsed");
      await placeOrder(lapsed.customerId, "2026-08-01T01:00:00Z");
      const recent = await newCustomer("Recent");
      await placeOrder(recent.customerId, "2026-08-01T01:00:00Z");
      await placeOrder(recent.customerId, "2026-08-13T01:00:00Z");
      // Never ordered: not "lapsed", there's nothing to follow up.
      await newCustomer("Never Ordered");
      // Only a cancelled order recently: still lapsed.
      const cancelledOnly = await newCustomer("Cancelled Recently");
      await placeOrder(cancelledOnly.customerId, "2026-08-01T01:00:00Z");
      const cancelled = await placeOrder(cancelledOnly.customerId, "2026-08-14T01:00:00Z", OrderStatus.PENDING);
      await OrderService.updateStatus(cancelled.orderId, OrderStatus.CANCELLED, { userId: USER_ID });

      const after = (await DashboardService.getSummary(NOW)).customers;
      expect(after.noRecentOrder - before.noRecentOrder).toBe(2);
    });
  });

  describe("stock", () => {
    it("should list each product separately and count temporary loans", async () => {
      const customer = await newCustomer("Borrower");
      const before = (await DashboardService.getSummary(NOW)).stock;
      await EquipmentService.logEquipment(
        {
          customerId: customer.customerId,
          productId: 1,
          actionType: EquipmentActionType.TEMPORARY,
          quantity: 2,
        },
        USER_ID,
      );

      const after = (await DashboardService.getSummary(NOW)).stock;
      const product = (rows: typeof after.products) =>
        rows.find((row) => row.productId === 1)!;

      expect(after.products.length).toBeGreaterThanOrEqual(3);
      expect(product(after.products).inStation).toBe(product(before.products).inStation - 2);
      expect(product(after.products).withCustomers).toBe(product(before.products).withCustomers + 2);
      expect(after.temporaryLoans - before.temporaryLoans).toBe(2);
      expect(after.products.every((row) => row.matchesLedger)).toBe(true);
    });

    it("should flag a product whose totals drifted from the ledger", async () => {
      await ProductInventory.increment("stockInStation", { by: 5, where: { productId: 2 } });

      const { stock } = await DashboardService.getSummary(NOW);

      expect(stock.products.find((row) => row.productId === 2)?.matchesLedger).toBe(false);
      await ProductInventory.decrement("stockInStation", { by: 5, where: { productId: 2 } });
    });
  });

  it("should not hide failures as zeros", async () => {
    const spy = (await import("vitest")).vi
      .spyOn(Order, "findAll")
      .mockRejectedValueOnce(new Error("database unavailable"));

    await expect(DashboardService.getSummary(NOW)).rejects.toThrow("database unavailable");
    spy.mockRestore();
  });
});
