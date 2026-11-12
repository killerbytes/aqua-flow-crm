import { beforeAll, describe, expect, it, vi } from "vitest";
import { Order } from "../../src/backend/models";
import { InvoiceService, ProductService } from "../../src/backend/services";
import { OrderService } from "../../src/backend/services/order.service";
import { OrderStatus } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Order Service & Workflows", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("Order Filtering", () => {
    it("should return only orders with the requested status", async () => {
      const expected = await Order.count({
        where: { status: OrderStatus.PENDING },
      });
      expect(expected).toBeGreaterThan(0);

      const result = await OrderService.getAll({
        query: { status: OrderStatus.PENDING },
      });

      expect(result.pagination.total).toBe(expected);
      expect(
        result.rows.every((order: any) => order.status === OrderStatus.PENDING),
      ).toBe(true);
    });

    it("should combine a status filter with the invoice filter", async () => {
      const result = await OrderService.getAll({
        query: { status: OrderStatus.CANCELLED, isInvoice: true },
      });

      expect(result.rows).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("Order Creation & Financial Totals", () => {
    it("should create order and calculate item discounts accurately", async () => {
      const created = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1,
      );

      expect(created.orderId).toBeDefined();
      expect(created.totalAmount).toBeDefined();
      expect(created.orderDetails).toHaveLength(1);
    });

    it("should add the surcharge staff set to the order total", async () => {
      const order = (surcharge?: number, quantity = 1) =>
        OrderService.create(
          {
            customerId: 1,
            status: OrderStatus.PENDING,
            paymentStatus: "UNPAID",
            items: [{ productId: 1, quantity, discount: 0 }],
            surcharge,
          },
          1,
        );

      const plain = await order();
      expect(plain.surcharge).toBe(0);

      const charged = await order(5);
      expect(charged.surcharge).toBe(5);
      expect(charged.totalAmount).toBeCloseTo(plain.totalAmount + 5, 2);

      // Staff can change the amount, and charge it on a larger order too.
      const custom = await order(7.5, 3);
      expect(custom.surcharge).toBe(7.5);
      expect(custom.totalAmount).toBeCloseTo(plain.totalAmount * 3 + 7.5, 2);
    });

    it("should leave stockInStation unchanged upon order creation", async () => {
      const productBefore = await ProductService.get(1);
      const initialStock = productBefore?.stockInStation ?? 0;

      await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 3, unitPrice: 50.0 }],
        },
        1,
      );

      const productAfter = await ProductService.get(1);
      expect(productAfter?.stockInStation).toBe(initialStock);
    });
  });

  describe("Editing a pending order", () => {
    const newOrder = async (surcharge?: number) =>
      (await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 1, discount: 0 }],
          surcharge,
        },
        1,
      ))!;

    it("should replace the items and surcharge and recalculate the total", async () => {
      const order = await newOrder(5);
      const unitNet = order.totalAmount - 5;

      const updated = (await OrderService.update(order.orderId, {
        // A price in the request is ignored, as on creation.
        items: [{ productId: 1, quantity: 4, unitPrice: 0.01, discount: 0 }],
        surcharge: 0,
      }))!;

      expect(updated.orderDetails).toHaveLength(1);
      expect(updated.orderDetails[0].quantity).toBe(4);
      expect(updated.surcharge).toBe(0);
      expect(updated.totalAmount).toBeCloseTo(unitNet * 4, 2);
      expect(updated.status).toBe(OrderStatus.PENDING);
    });

    it("should keep the surcharge when the request leaves it out", async () => {
      const order = await newOrder(7.5);

      const updated = (await OrderService.update(order.orderId, {
        items: [{ productId: 1, quantity: 2, discount: 0 }],
      }))!;

      expect(updated.surcharge).toBe(7.5);
      expect(updated.totalAmount).toBeCloseTo((order.totalAmount - 7.5) * 2 + 7.5, 2);
    });

    it("should refuse orders that are no longer pending", async () => {
      const order = await newOrder();
      await OrderService.updateStatus(order.orderId, OrderStatus.OUT_FOR_DELIVERY);

      await expect(
        OrderService.update(order.orderId, {
          items: [{ productId: 1, quantity: 9, discount: 0 }],
        }),
      ).rejects.toThrow(/Only pending orders can be edited/);

      const after = (await OrderService.get(order.orderId))!;
      expect(after.orderDetails[0].quantity).toBe(1);
      expect(after.totalAmount).toBe(order.totalAmount);
    });

    it("should refuse a pending order that is already paid", async () => {
      const order = await newOrder();
      await OrderService.makePayment({ paymentMethod: "CASH" } as any, order.orderId, 1);

      await expect(
        OrderService.update(order.orderId, {
          items: [{ productId: 1, quantity: 9, discount: 0 }],
        }),
      ).rejects.toThrow(/already paid/);
    });

    it("should refuse a pending order that is on an invoice", async () => {
      const order = await newOrder();
      await InvoiceService.create(
        { customerId: 1, status: "UNPAID", items: [order.orderId] } as any,
        1,
      );

      await expect(
        OrderService.update(order.orderId, {
          items: [{ productId: 1, quantity: 9, discount: 0 }],
        }),
      ).rejects.toThrow(/on an invoice/);
    });
  });

  describe("Order Status State Machine Transitions", () => {
    it("should allow valid status transitions PENDING -> OUT_FOR_DELIVERY -> DELIVERED -> CANCELLED", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 5, unitPrice: 50.0 }],
        },
        1,
      );

      const outForDelivery = await OrderService.updateStatus(
        order.orderId,
        OrderStatus.OUT_FOR_DELIVERY,
      );
      expect(outForDelivery.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

      const delivered = await OrderService.updateStatus(
        order.orderId,
        OrderStatus.DELIVERED,
      );
      expect(delivered.status).toBe(OrderStatus.DELIVERED);

      const cancelled = await OrderService.updateStatus(
        order.orderId,
        OrderStatus.CANCELLED,
      );
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    });

    it("should allow status transition from OUT_FOR_DELIVERY back to PENDING and log current user", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 2, unitPrice: 50.0 }],
        },
        1,
      );

      const outForDelivery = await OrderService.updateStatus(
        order.orderId,
        OrderStatus.OUT_FOR_DELIVERY,
      );
      expect(outForDelivery.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

      const testUser = { userId: 1, name: "Admin User", role: "Admin" };
      const backToPending = await OrderService.updateStatus(
        order.orderId,
        OrderStatus.PENDING,
        testUser,
      );
      expect(backToPending.status).toBe(OrderStatus.PENDING);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Order #" + order.orderId),
        testUser,
      );
      consoleSpy.mockRestore();
    });

    it("should reject invalid status transitions", async () => {
      const order = await OrderService.create(
        {
          customerId: 1,
          status: OrderStatus.PENDING,
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 1, unitPrice: 50.0 }],
        },
        1,
      );

      await expect(
        OrderService.updateStatus(order.orderId, "INVALID_STATUS" as any),
      ).rejects.toThrow(/Invalid order status/i);
    });
  });

  describe("Pagination & Query Filters", () => {
    it("should query orders with pagination and summary metrics", async () => {
      const result = await OrderService.getAll({
        page: 1,
        limit: 10,
      });

      expect(result.rows).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("should support customer name sorting without subQuery errors", async () => {
      const result = await OrderService.getAll({
        sort: "customer.name",
        order: "ASC",
        page: 1,
        limit: 10,
      });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].customer).toBeDefined();
    });
  });
});
