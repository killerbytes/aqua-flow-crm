import { beforeAll, describe, expect, it } from "vitest";
import { InvoiceService, OrderService } from "../../src/backend/services";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Invoice Service & Workflows", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("Invoice Creation", () => {
    it("should create an invoice from unpaid orders and calculate total amount", async () => {
      // 1. Create a test order
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1,
      );

      // 2. Create invoice linking the order
      const invoice = await InvoiceService.create(
        {
          customerId: 1,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      );

      expect(invoice).toBeDefined();
      expect(invoice.invoiceId).toBeDefined();
      expect(Number(invoice.amount)).toBe(Number(order.totalAmount));
      expect(invoice.customerId).toBe(1);
    });
  });

  describe("Invoice Payment (payInvoice)", () => {
    it("should update invoice status to PAID, set paymentDate, and update linked orders to PAID", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: 1, quantity: 1, unitPrice: 100.0 }],
        },
        1,
      );

      const invoice = await InvoiceService.create(
        {
          customerId: 1,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      );

      const updatedInvoice = await InvoiceService.payInvoice({
        invoiceId: invoice.invoiceId,
        paymentAmount: Number(invoice.amount),
        paymentMethod: PaymentMethod.CASH,
      });

      expect(updatedInvoice.status).toBe(InvoiceStatus.PAID);
      expect(updatedInvoice.paymentDate).toBeDefined();

      const updatedOrder = await OrderService.get(order.orderId);
      expect(updatedOrder?.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it("should throw an error if attempting to pay an already paid invoice", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: 1, quantity: 1, unitPrice: 50.0 }],
        },
        1,
      );

      const invoice = await InvoiceService.create(
        {
          customerId: 1,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      );

      const payData = {
        invoiceId: invoice.invoiceId,
        paymentAmount: Number(invoice.amount),
        paymentMethod: PaymentMethod.CASH,
      };

      await InvoiceService.payInvoice(payData);
      await expect(InvoiceService.payInvoice(payData)).rejects.toThrow();
    });

    it("should handle partial payments correctly and update status to PARTIAL then PAID", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1,
      );

      const invoice = await InvoiceService.create(
        {
          customerId: 1,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      );

      const invoiceAmount = Number(invoice.amount);
      const partialPayment = Math.floor(invoiceAmount / 2);
      const remainingPayment = invoiceAmount - partialPayment;

      // 1. Partial payment of half invoice amount
      const partialInvoice = await InvoiceService.payInvoice({
        invoiceId: invoice.invoiceId,
        paymentAmount: partialPayment,
        paymentMethod: PaymentMethod.CASH,
      });

      expect(partialInvoice.status).toBe(InvoiceStatus.PARTIAL);

      // 2. Overpaying should throw an error
      await expect(
        InvoiceService.payInvoice({
          invoiceId: invoice.invoiceId,
          paymentAmount: remainingPayment + 10,
          paymentMethod: PaymentMethod.CASH,
        }),
      ).rejects.toThrow();

      // 3. Final payment of remaining balance settles invoice
      const finalInvoice = await InvoiceService.payInvoice({
        invoiceId: invoice.invoiceId,
        paymentAmount: remainingPayment,
        paymentMethod: PaymentMethod.CASH,
      });

      expect(finalInvoice.status).toBe(InvoiceStatus.PAID);
    });
  });

  describe("Invoice Summary", () => {
    it("should calculate summary metrics including net unpaid balance for UNPAID and PARTIAL invoices", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1,
      );

      const invoice = await InvoiceService.create(
        {
          customerId: 1,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      );

      const invoiceAmount = Number(invoice.amount);
      const partialPayment = Math.floor(invoiceAmount / 2);

      await InvoiceService.payInvoice({
        invoiceId: invoice.invoiceId,
        paymentAmount: partialPayment,
        paymentMethod: PaymentMethod.CASH,
      });

      const res = await InvoiceService.getAll({});
      expect(res.summary).toBeDefined();
      expect(res.summary.totalUnpaid).toBeDefined();
      expect(res.summary.partialOrders.value).toBeGreaterThanOrEqual(1);
    });
  });
});
