import { beforeAll, describe, expect, it, vi } from "vitest";
import { Order, OrderDetail, ProductInventory } from "../../src/backend/models";
import {
  CustomerService,
  EquipmentService,
  InventoryService,
  InvoiceService,
  OrderService,
} from "../../src/backend/services";
import {
  EquipmentActionType,
  InventoryAdjustmentType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";
import { businessDateKey, startOfBusinessDay } from "../../src/lib/business-time";

const CUSTOMER_ID = 7;
const PRODUCT_ID = 1;

const createOrder = (quantity = 1) =>
  OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: PRODUCT_ID, quantity }],
    } as any,
    1,
  );

const createInvoice = (orderIds: number[], status = InvoiceStatus.UNPAID) =>
  InvoiceService.create(
    { customerId: CUSTOMER_ID, status, items: orderIds },
    1,
  );

const pay = (invoiceId: number, paymentAmount: number) =>
  InvoiceService.payInvoice(
    { invoiceId, paymentAmount, paymentMethod: PaymentMethod.CASH },
    1,
  );

describe("Integration - Billing Integrity", () => {
  let catalogPrice: number;

  beforeAll(async () => {
    await setupTestDatabase();
    const product = await ProductInventory.findByPk(PRODUCT_ID);
    catalogPrice = product!.unitPrice;
  });

  describe("Invoice creation rules", () => {
    it("should not put an order on two invoices", async () => {
      const order = await createOrder();
      await createInvoice([order!.orderId]);

      await expect(createInvoice([order!.orderId])).rejects.toThrow(
        /already on an invoice/,
      );
    });

    it("should not invoice a cancelled order", async () => {
      const order = await createOrder();
      await OrderService.updateStatus(order!.orderId, OrderStatus.CANCELLED, {
        userId: 1,
      });

      await expect(createInvoice([order!.orderId])).rejects.toThrow(
        /Cancelled orders/,
      );
    });

    it("should not invoice a paid order", async () => {
      const order = await createOrder();
      await OrderService.makePayment(
        { paymentMethod: PaymentMethod.CASH },
        order!.orderId,
      );

      await expect(createInvoice([order!.orderId])).rejects.toThrow(
        /already paid/,
      );
    });

    it("should reject an invoice when any order belongs to someone else", async () => {
      const mine = await createOrder();
      const theirs = await OrderService.create(
        {
          customerId: 8,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: PRODUCT_ID, quantity: 1 }],
        } as any,
        1,
      );

      await expect(
        createInvoice([mine!.orderId, theirs!.orderId]),
      ).rejects.toThrow(/not found for this customer/);
    });

    it("should always create invoices as unpaid", async () => {
      const order = await createOrder();
      const invoice = await createInvoice(
        [order!.orderId],
        InvoiceStatus.PAID,
      );
      expect(invoice.status).toBe(InvoiceStatus.UNPAID);
    });

    it("should hide invoiced orders from the invoice order list", async () => {
      const invoiced = await createOrder();
      await createInvoice([invoiced!.orderId]);
      const available = await createOrder();

      const { rows } = await OrderService.getAll({
        limit: 100,
        query: {
          isInvoice: true,
          customerId: CUSTOMER_ID,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });
      const ids = rows.map((order: any) => order.orderId);

      expect(ids).toContain(available!.orderId);
      expect(ids).not.toContain(invoiced!.orderId);
    });
  });

  describe("Orders on an invoice", () => {
    it("should not cancel an invoiced order", async () => {
      const order = await createOrder();
      await createInvoice([order!.orderId]);

      await expect(
        OrderService.updateStatus(order!.orderId, OrderStatus.CANCELLED, {
          userId: 1,
        }),
      ).rejects.toThrow(/on an invoice/);
    });

    it("should not take direct payment for an invoiced order", async () => {
      const order = await createOrder();
      await createInvoice([order!.orderId]);

      await expect(
        OrderService.makePayment(
          { paymentMethod: PaymentMethod.CASH },
          order!.orderId,
        ),
      ).rejects.toThrow(/on an invoice/);
    });
  });

  describe("Payment arithmetic", () => {
    const invoiceFor = async (price: number) => {
      await ProductInventory.update(
        { unitPrice: price },
        { where: { productId: PRODUCT_ID } },
      );
      const order = await createOrder();
      await ProductInventory.update(
        { unitPrice: catalogPrice },
        { where: { productId: PRODUCT_ID } },
      );
      return await createInvoice([order!.orderId]);
    };

    it("should settle 100.30 with payments of 100.20 and 0.10", async () => {
      const invoice = await invoiceFor(100.3);

      const partial = await pay(invoice.invoiceId, 100.2);
      expect(partial.status).toBe(InvoiceStatus.PARTIAL);

      const final = await pay(invoice.invoiceId, 0.1);
      expect(final.status).toBe(InvoiceStatus.PAID);
    });

    it("should reject a payment one centavo over the balance", async () => {
      const invoice = await invoiceFor(100.3);

      await expect(pay(invoice.invoiceId, 100.31)).rejects.toThrow(
        /exceeds remaining balance/,
      );
    });

    it("should total three 0.10 items as exactly 0.30", async () => {
      await ProductInventory.update(
        { unitPrice: 0.1 },
        { where: { productId: PRODUCT_ID } },
      );
      const order = await createOrder(3);
      await ProductInventory.update(
        { unitPrice: catalogPrice },
        { where: { productId: PRODUCT_ID } },
      );

      expect(order!.totalAmount).toBe(0.3);
    });
  });

  describe("Order pricing", () => {
    it("should ignore a price and discount sent by the client", async () => {
      const order = await OrderService.create(
        {
          customerId: CUSTOMER_ID,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          items: [
            { productId: PRODUCT_ID, quantity: 100, unitPrice: 0.01, discount: 30 },
          ],
        },
        1,
      );

      expect(order!.totalAmount).toBe(catalogPrice * 100);
      expect(order!.orderDetails[0].unitPrice).toBe(catalogPrice);
      expect(order!.orderDetails[0].discount).toBe(0);
    });

    it("should apply the customer's special pricing", async () => {
      await CustomerService.setSpecialPricing({
        customerId: 9,
        productId: PRODUCT_ID,
        discountAmount: 2.5,
      });

      const order = await OrderService.create(
        {
          customerId: 9,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          items: [{ productId: PRODUCT_ID, quantity: 2 }],
        } as any,
        1,
      );

      expect(order!.totalAmount).toBe((catalogPrice - 2.5) * 2);
      expect(order!.orderDetails[0].discount).toBe(2.5);
    });
  });

  describe("Orders created by staff", () => {
    const daysAgo = (days: number) =>
      businessDateKey(startOfBusinessDay(new Date(), -days));
    const request = {
      customerId: 6,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      createdAt: daysAgo(5),
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    };

    it("should start regular orders as new and unpaid, on the date entered", async () => {
      const order = await OrderService.createForStaff(request as any, 1);

      expect(order!.status).toBe(OrderStatus.PENDING);
      expect(order!.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(businessDateKey(new Date(order!.createdAt))).toBe(daysAgo(5));
    });

    it("should keep the current time of day on an entered date", async () => {
      const now = new Date();
      const yesterday = businessDateKey(new Date(now.getTime() - 86400000));
      const order = await OrderService.createForStaff(
        { ...request, createdAt: yesterday } as any,
        1,
      );

      const createdAt = new Date(order!.createdAt);
      expect(businessDateKey(createdAt)).toBe(yesterday);
      // The same time of day, one day earlier, give or take the test's run time.
      expect(Math.abs(now.getTime() - 86400000 - createdAt.getTime())).toBeLessThan(60000);
    });

    it("should use now when no date is entered", async () => {
      const { createdAt: _omitted, ...undated } = request;
      const before = Date.now();
      const order = await OrderService.createForStaff(undated as any, 1);

      expect(new Date(order!.createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it("should refuse an order date after today", async () => {
      const tomorrow = businessDateKey(new Date(Date.now() + 86400000));
      const before = await Order.count();

      await expect(
        OrderService.createForStaff({ ...request, createdAt: tomorrow } as any, 1),
      ).rejects.toThrow("Order date can't be in the future");
      await expect(
        OrderService.createForStaff(
          { ...request, customerId: (await CustomerService.getOrCreateWalkIn()).customerId, createdAt: tomorrow } as any,
          1,
        ),
      ).rejects.toThrow("Order date can't be in the future");
      expect(await Order.count()).toBe(before);
    });

    it("should allow an order date 30 days back, but not 31", async () => {
      const order = await OrderService.createForStaff(
        { ...request, createdAt: daysAgo(30) } as any,
        1,
      );
      expect(businessDateKey(new Date(order!.createdAt))).toBe(daysAgo(30));

      await expect(
        OrderService.createForStaff({ ...request, createdAt: daysAgo(31) } as any, 1),
      ).rejects.toThrow("Order date can't be more than 30 days ago");
      await expect(
        OrderService.createForStaff(
          { ...request, customerId: (await CustomerService.getOrCreateWalkIn()).customerId, createdAt: daysAgo(31) } as any,
          1,
        ),
      ).rejects.toThrow("Order date can't be more than 30 days ago");
    });

    it("should refuse an order date that isn't a real date", async () => {
      await expect(
        OrderService.createForStaff({ ...request, createdAt: "2026-02-30" } as any, 1),
      ).rejects.toThrow("Order date is not a valid date");
    });

    it("should let walk-in sales set status, payment, and date", async () => {
      const walkIn = await CustomerService.getOrCreateWalkIn();
      const order = await OrderService.createForStaff(
        { ...request, customerId: walkIn.customerId } as any,
        1,
      );

      expect(order!.status).toBe(OrderStatus.DELIVERED);
      expect(order!.paymentStatus).toBe(PaymentStatus.PAID);
      expect(businessDateKey(new Date(order!.createdAt))).toBe(daysAgo(5));
    });
  });

  describe("Atomic writes", () => {
    it("should leave no order behind when saving its lines fails", async () => {
      const before = await Order.count();
      const spy = vi
        .spyOn(OrderDetail, "bulkCreate")
        .mockRejectedValueOnce(new Error("db hiccup"));

      await expect(createOrder()).rejects.toThrow("db hiccup");

      spy.mockRestore();
      expect(await Order.count()).toBe(before);
    });

    const failStockUpdateOnce = () =>
      vi
        .spyOn(ProductInventory, "decrement")
        .mockRejectedValueOnce(new Error("db hiccup"));

    it("should roll back an equipment log when updating stock fails", async () => {
      const before = await ProductInventory.findByPk(PRODUCT_ID);
      const logsBefore = await EquipmentService.getAll({ limit: 1 });
      const spy = failStockUpdateOnce();

      await expect(
        EquipmentService.logEquipment(
          {
            customerId: CUSTOMER_ID,
            productId: PRODUCT_ID,
            actionType: EquipmentActionType.ISSUE,
            quantity: 1,
          },
          1,
        ),
      ).rejects.toThrow("db hiccup");

      spy.mockRestore();
      const logsAfter = await EquipmentService.getAll({ limit: 1 });
      const after = await ProductInventory.findByPk(PRODUCT_ID);
      expect(logsAfter.pagination.total).toBe(logsBefore.pagination.total);
      expect(after!.stockWithCustomers).toBe(before!.stockWithCustomers);
    });

    it("should roll back a stock adjustment when updating stock fails", async () => {
      const before = await ProductInventory.findByPk(PRODUCT_ID);
      const logsBefore = await InventoryService.getAll({ limit: 1 });
      const spy = failStockUpdateOnce();

      await expect(
        InventoryService.createAdjustment({
          productId: PRODUCT_ID,
          adjustmentType: InventoryAdjustmentType.DECLARED_DAMAGED,
          quantity: 1,
        }),
      ).rejects.toThrow("db hiccup");

      spy.mockRestore();
      const logsAfter = await InventoryService.getAll({ limit: 1 });
      const after = await ProductInventory.findByPk(PRODUCT_ID);
      expect(logsAfter.pagination.total).toBe(logsBefore.pagination.total);
      expect(after!.stockDamaged).toBe(before!.stockDamaged);
    });
  });
});
