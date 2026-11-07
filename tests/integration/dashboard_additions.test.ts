import { beforeAll, describe, expect, it } from "vitest";
import { Order, ProductInventory, User } from "../../src/backend/models";
import {
  CustomerService,
  EquipmentService,
  InventoryService,
  OrderService,
  ProductService,
} from "../../src/backend/services";
import {
  DashboardService,
  TREND_DAYS,
} from "../../src/backend/services/dashboard.service";
import {
  EquipmentActionType,
  InventoryAdjustmentType,
  OrderStatus,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;
const CUSTOMER_ID = 9;

const pendingOrder = async () =>
  (await OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  ))!;

describe("Integration - Dashboard Additions", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("sales trend", () => {
    // 10:00 on 20 Sep 2026 in Manila.
    const NOW = new Date("2026-09-20T02:00:00Z");

    it("should return one entry per day, oldest first, ending today", async () => {
      const { trend } = await DashboardService.getSummary(NOW);

      expect(trend).toHaveLength(TREND_DAYS);
      expect(trend[0].date).toBe("2026-09-07");
      expect(trend[TREND_DAYS - 1].date).toBe("2026-09-20");
    });

    it("should put each delivery on its Philippine day, and leave quiet days at zero", async () => {
      const early = await pendingOrder();
      const midday = await pendingOrder();
      // 00:30 Manila on the 20th is still the 19th in UTC.
      await Order.update(
        { status: OrderStatus.DELIVERED, deliveredAt: "2026-09-19T16:30:00Z" },
        { where: { orderId: early.orderId } },
      );
      await Order.update(
        { status: OrderStatus.DELIVERED, deliveredAt: "2026-09-15T04:00:00Z" },
        { where: { orderId: midday.orderId } },
      );

      const { trend } = await DashboardService.getSummary(NOW);
      const day = (date: string) => trend.find((d) => d.date === date)!;

      expect(day("2026-09-20").orderCount).toBe(1);
      expect(day("2026-09-20").sales).toBeCloseTo(early.totalAmount, 2);
      expect(day("2026-09-19").orderCount).toBe(0);
      expect(day("2026-09-15").orderCount).toBe(1);
      expect(day("2026-09-10")).toEqual({ date: "2026-09-10", sales: 0, orderCount: 0 });
    });
  });

  describe("deliveries by driver", () => {
    it("should record who marked an order delivered", async () => {
      const driver = await User.create({
        name: "Driver Dan",
        username: "driverdan",
        passwordHash: "x",
        role: "DELIVERY",
      });
      const order = await pendingOrder();

      await OrderService.updateStatus(order.orderId, OrderStatus.DELIVERED, {
        userId: driver.userId,
      });

      expect((await Order.findByPk(order.orderId))?.deliveredBy).toBe(driver.userId);
    });

    it("should credit walk-in sales to the cashier who rang them up", async () => {
      const walkIn = await CustomerService.getOrCreateWalkIn();
      const order = (await OrderService.create(
        {
          customerId: walkIn.customerId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          items: [{ productId: 1, quantity: 1 }],
        } as any,
        USER_ID,
      ))!;

      expect((await Order.findByPk(order.orderId))?.deliveredBy).toBe(USER_ID);
    });

    it("should count today's deliveries per person, busiest first", async () => {
      const before = (await DashboardService.getSummary()).drivers;
      const driver = await User.create({
        name: "Driver Dee",
        username: "driverdee",
        passwordHash: "x",
        role: "DELIVERY",
      });
      for (let i = 0; i < 2; i++) {
        const order = await pendingOrder();
        await OrderService.updateStatus(order.orderId, OrderStatus.DELIVERED, {
          userId: driver.userId,
        });
      }
      // Delivered before this was recorded: no one to credit.
      const legacy = await pendingOrder();
      await Order.update(
        { status: OrderStatus.DELIVERED, deliveredAt: new Date(), deliveredBy: null },
        { where: { orderId: legacy.orderId } },
      );

      const { drivers } = await DashboardService.getSummary();
      const countFor = (name: string, list = drivers) =>
        list.find((d) => d.name === name)?.count ?? 0;

      expect(countFor("Driver Dee")).toBe(2);
      expect(countFor("Not recorded") - countFor("Not recorded", before)).toBe(1);
      expect(drivers.map((d) => d.count)).toEqual(
        [...drivers.map((d) => d.count)].sort((a, b) => b - a),
      );
    });
  });

  describe("low stock", () => {
    const productWithStock = async (name: string, stock: number, threshold: number | null) => {
      const product = (await ProductService.create({
        name,
        unitPrice: 35,
        lowStockThreshold: threshold,
      }))!;
      if (stock > 0) {
        await InventoryService.createAdjustment(
          { productId: product.productId, adjustmentType: InventoryAdjustmentType.STOCK_IN, quantity: stock },
          USER_ID,
        );
      }
      return product;
    };
    const stockRow = async (productId: number) =>
      (await DashboardService.getSummary()).stock.products.find((p) => p.productId === productId)!;

    it("should flag station stock at or below the threshold", async () => {
      const below = await productWithStock("Below", 3, 5);
      const at = await productWithStock("At", 5, 5);
      const above = await productWithStock("Above", 6, 5);

      expect((await stockRow(below.productId)).isLow).toBe(true);
      expect((await stockRow(at.productId)).isLow).toBe(true);
      expect((await stockRow(above.productId)).isLow).toBe(false);
    });

    it("should never warn without a threshold, even at zero stock", async () => {
      const product = await productWithStock("No Threshold", 0, null);
      expect((await stockRow(product.productId)).isLow).toBe(false);
    });

    it("should let the threshold be set and cleared from the product form", async () => {
      const product = await productWithStock("Editable", 2, null);

      await ProductService.update(product.productId, { lowStockThreshold: 4 });
      expect((await stockRow(product.productId)).isLow).toBe(true);

      await ProductService.update(product.productId, { lowStockThreshold: null });
      expect((await stockRow(product.productId)).isLow).toBe(false);
    });

    it("should refuse a negative or fractional threshold", async () => {
      await expect(
        ProductService.create({ name: "Negative", unitPrice: 35, lowStockThreshold: -1 }),
      ).rejects.toThrow();
      await expect(
        ProductService.create({ name: "Fraction", unitPrice: 35, lowStockThreshold: 2.5 }),
      ).rejects.toThrow();
    });
  });

  describe("containers held longest", () => {
    it("should list customers holding containers, longest idle first, at most five", async () => {
      const customer = await CustomerService.create({
        name: "Holds Containers",
        address: "123 Test Street",
        phone: "",
      });
      await EquipmentService.logEquipment(
        {
          customerId: customer!.customerId,
          productId: 1,
          actionType: EquipmentActionType.ISSUE,
          quantity: 2,
        },
        USER_ID,
      );

      const { heldLongest } = await DashboardService.getSummary();
      const row = heldLongest.find((r) => r.customerId === customer!.customerId);

      expect(heldLongest.length).toBeLessThanOrEqual(5);
      expect(heldLongest.every((r) => r.quantity > 0)).toBe(true);
      expect(heldLongest.map((r) => r.daysIdle)).toEqual(
        [...heldLongest.map((r) => r.daysIdle)].sort((a, b) => b - a),
      );
      if (row) expect(row.quantity).toBe(2);
    });
  });

  it("should still keep stock totals in line with the ledger", async () => {
    const { stock } = await DashboardService.getSummary();
    expect(stock.products.every((p) => p.matchesLedger)).toBe(true);
    void ProductInventory;
  });
});
