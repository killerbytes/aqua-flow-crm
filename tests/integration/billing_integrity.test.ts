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
    const request = {
      customerId: 6,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      createdAt: "2020-01-01",
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    };

    it("should start regular orders as new and unpaid", async () => {
      const order = await OrderService.createForStaff(request as any, 1);

      expect(order!.status).toBe(OrderStatus.PENDING);
      expect(order!.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(new Date(order!.createdAt).getFullYear()).toBeGreaterThan(2020);
    });

    it("should let walk-in sales set status, payment, and date", async () => {
      const walkIn = await CustomerService.getOrCreateWalkIn();
      const order = await OrderService.createForStaff(
        { ...request, customerId: walkIn.customerId } as any,
        1,
      );

      expect(order!.status).toBe(OrderStatus.DELIVERED);
      expect(order!.paymentStatus).toBe(PaymentStatus.PAID);
      expect(new Date(order!.createdAt).getFullYear()).toBe(2020);
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
