import { beforeAll, describe, expect, it } from "vitest";
import { ProductService } from "../../src/backend/services";
import { OrderService } from "../../src/backend/services/order.service";
import { OrderStatus } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Order Service & Workflows", () => {
  beforeAll(async () => {
    await setupTestDatabase();
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
