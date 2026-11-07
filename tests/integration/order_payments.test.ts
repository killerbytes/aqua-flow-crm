import { beforeAll, describe, expect, it, vi } from "vitest";
import { reverseOrderPaymentAction } from "../../src/backend/actions/order.actions";
import * as authContext from "../../src/backend/auth/context";
import { OrderPayment } from "../../src/backend/models";
import {
  CustomerService,
  InvoiceService,
  OrderService,
} from "../../src/backend/services";
import { DashboardService } from "../../src/backend/services/dashboard.service";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const CUSTOMER_ID = 6;
const USER_ID = 1;

const newOrder = async (status: string = OrderStatus.DELIVERED) =>
  (await OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  ))!;

const payDirectly = (orderId: number, method = PaymentMethod.CASH) =>
  OrderService.makePayment(
    { paymentMethod: method, paymentNotes: "At the door" },
    orderId,
    USER_ID,
  );

const paymentsOf = async (orderId: number) =>
  ((await OrderService.get(orderId)) as any).orderPayments as any[];

const reverse = (paymentId: number, reason = "Customer hadn't actually paid") =>
  OrderService.reversePayment(paymentId, { reason }, USER_ID);

describe("Integration - Order Payments", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("recording", () => {
    it("should record a direct payment with amount, method, time, and who took it", async () => {
      const order = await newOrder();
      const before = Date.now();

      await payDirectly(order.orderId, PaymentMethod.GCASH);

      const [payment] = await paymentsOf(order.orderId);
      expect(payment.amount).toBe(order.totalAmount);
      expect(payment.paymentMethod).toBe(PaymentMethod.GCASH);
      expect(payment.paymentNotes).toBe("At the door");
      expect(new Date(payment.paidAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(payment.user?.userId).toBe(USER_ID);
      expect(payment.user).not.toHaveProperty("passwordHash");
    });

    it("should record a walk-in sale's payment on the date the cashier chose", async () => {
      const walkIn = await CustomerService.getOrCreateWalkIn();
      const order = (await OrderService.create(
        {
          customerId: walkIn.customerId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          createdAt: "2026-08-01T04:00:00Z",
          items: [{ productId: 1, quantity: 3 }],
        } as any,
        USER_ID,
      ))!;

      const [payment] = await paymentsOf(order.orderId);
      expect(payment.amount).toBe(order.totalAmount);
      expect(new Date(payment.paidAt).toISOString()).toBe("2026-08-01T04:00:00.000Z");
      expect(payment.paymentMethod).toBeNull();
    });

    it("should not record order payments for orders paid through an invoice", async () => {
      const order = await newOrder();
      const invoice = await InvoiceService.create(
        { customerId: CUSTOMER_ID, status: InvoiceStatus.UNPAID, items: [order.orderId] },
        USER_ID,
      );
      await InvoiceService.payInvoice(
        { invoiceId: invoice.invoiceId, paymentAmount: order.totalAmount, paymentMethod: PaymentMethod.CASH },
        USER_ID,
      );

      expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(PaymentStatus.PAID);
      expect(await paymentsOf(order.orderId)).toEqual([]);
    });
  });

  describe("reversing", () => {
    it("should mark the payment reversed and the order unpaid", async () => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [payment] = await paymentsOf(order.orderId);

      await reverse(payment.id);

      const saved = await OrderService.get(order.orderId);
      expect(saved?.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(saved?.paymentMethod).toBeNull();
      const [reversed] = await paymentsOf(order.orderId);
      expect(reversed.reversedAt).toBeTruthy();
      expect(reversed.reversalReason).toBe("Customer hadn't actually paid");
      expect(reversed.reversedByUser?.userId).toBe(USER_ID);
    });

    it("should allow paying again, keeping both records", async () => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [first] = await paymentsOf(order.orderId);
      await reverse(first.id);

      await payDirectly(order.orderId, PaymentMethod.GCASH);

      const payments = await paymentsOf(order.orderId);
      expect(payments).toHaveLength(2);
      expect(payments.filter((p) => !p.reversedAt)).toHaveLength(1);
      expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it("should reverse a walk-in sale's payment", async () => {
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
      const [payment] = await paymentsOf(order.orderId);

      await reverse(payment.id);

      expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it("should not reverse the same payment twice", async () => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [payment] = await paymentsOf(order.orderId);
      await reverse(payment.id);

      await expect(reverse(payment.id)).rejects.toThrow(/already been reversed/);
    });

    it("should require a reason and report a missing payment", async () => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [payment] = await paymentsOf(order.orderId);

      await expect(reverse(payment.id, " ")).rejects.toThrow();
      await expect(reverse(999999)).rejects.toThrow("Payment not found");
    });
  });

  describe("delivery date", () => {
    it("should set when an order is delivered, not when it was placed", async () => {
      const order = await newOrder(OrderStatus.PENDING);
      expect((await OrderService.get(order.orderId))?.deliveredAt).toBeNull();

      await OrderService.updateStatus(order.orderId, OrderStatus.OUT_FOR_DELIVERY, { userId: USER_ID });
      expect((await OrderService.get(order.orderId))?.deliveredAt).toBeNull();

      const before = Date.now();
      await OrderService.updateStatus(order.orderId, OrderStatus.DELIVERED, { userId: USER_ID });
      const deliveredAt = (await OrderService.get(order.orderId))?.deliveredAt;
      expect(new Date(deliveredAt!).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it("should use the order's date for orders created already delivered", async () => {
      const order = (await OrderService.create(
        {
          customerId: CUSTOMER_ID,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.UNPAID,
          createdAt: "2026-08-02T04:00:00Z",
          items: [{ productId: 1, quantity: 1 }],
        } as any,
        USER_ID,
      ))!;

      const saved = await OrderService.get(order.orderId);
      expect(new Date(saved!.deliveredAt!).toISOString()).toBe("2026-08-02T04:00:00.000Z");
    });
  });

  describe("dashboard", () => {
    const now = new Date();

    it("should count sales by delivery date, not order date", async () => {
      const before = (await DashboardService.getSummary(now)).today;
      const order = (await OrderService.create(
        {
          customerId: CUSTOMER_ID,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          items: [{ productId: 1, quantity: 1 }],
        } as any,
        USER_ID,
      ))!;
      await OrderService.updateStatus(order.orderId, OrderStatus.DELIVERED, { userId: USER_ID });

      const after = (await DashboardService.getSummary(now)).today;
      expect(after.orderCount - before.orderCount).toBe(1);
      expect(after.sales - before.sales).toBeCloseTo(order.totalAmount, 2);
    });

    it("should total cash collected from both kinds of payment, by method, minus reversals", async () => {
      const before = (await DashboardService.getSummary(now)).cash;

      const direct = await newOrder();
      await payDirectly(direct.orderId, PaymentMethod.CASH);
      const reversedOrder = await newOrder();
      await payDirectly(reversedOrder.orderId, PaymentMethod.CASH);
      const [toReverse] = await paymentsOf(reversedOrder.orderId);
      await reverse(toReverse.id);

      const invoicedOrder = await newOrder();
      const invoice = await InvoiceService.create(
        { customerId: CUSTOMER_ID, status: InvoiceStatus.UNPAID, items: [invoicedOrder.orderId] },
        USER_ID,
      );
      await InvoiceService.payInvoice(
        { invoiceId: invoice.invoiceId, paymentAmount: 5, paymentMethod: PaymentMethod.GCASH },
        USER_ID,
      );

      const after = (await DashboardService.getSummary(now)).cash;
      expect(after.paymentCount - before.paymentCount).toBe(2);
      expect(after.total - before.total).toBeCloseTo(direct.totalAmount + 5, 2);
      expect((after.byMethod.CASH ?? 0) - (before.byMethod.CASH ?? 0)).toBeCloseTo(direct.totalAmount, 2);
      expect((after.byMethod.GCASH ?? 0) - (before.byMethod.GCASH ?? 0)).toBeCloseTo(5, 2);
    });
  });

  describe("reverseOrderPaymentAction", () => {
    const signInAs = (role: UserRole) =>
      vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
        user: { userId: USER_ID, name: "Test", username: "test", role },
      });

    it.each([UserRole.ADMIN, UserRole.MANAGER])("should allow %s", async (role) => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [payment] = await paymentsOf(order.orderId);
      signInAs(role);

      expect((await reverseOrderPaymentAction(payment.id, { reason: "Mistake" })).success).toBe(true);
    });

    it.each([UserRole.CASHIER, UserRole.DELIVERY])("should refuse %s", async (role) => {
      const order = await newOrder();
      await payDirectly(order.orderId);
      const [payment] = await paymentsOf(order.orderId);
      signInAs(role);

      const res = await reverseOrderPaymentAction(payment.id, { reason: "Mistake" });
      expect(res).toMatchObject({ error: expect.stringMatching(/Forbidden/) });
      expect((await OrderPayment.findByPk(payment.id))?.reversedAt).toBeNull();
    });
  });
});
