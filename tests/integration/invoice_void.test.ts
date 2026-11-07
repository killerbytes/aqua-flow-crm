import { beforeAll, describe, expect, it, vi } from "vitest";
import { voidInvoiceAction } from "../../src/backend/actions/invoice.actions";
import * as authContext from "../../src/backend/auth/context";
import { InvoiceDetail } from "../../src/backend/models";
import {
  CustomerService,
  InvoiceService,
  OrderService,
} from "../../src/backend/services";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const CUSTOMER_ID = 4;
const USER_ID = 1;

const newOrder = () =>
  OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 1 }],
    } as any,
    USER_ID,
  );

const invoiceOrders = (orderIds: number[]) =>
  InvoiceService.create(
    {
      customerId: CUSTOMER_ID,
      status: InvoiceStatus.UNPAID,
      items: orderIds,
    },
    USER_ID,
  );

const newInvoice = async () => {
  const order = await newOrder();
  const invoice = await invoiceOrders([order!.orderId]);
  return { order: order!, invoice };
};

const voidInvoice = (invoiceId: number, reason = "Wrong customer billed") =>
  InvoiceService.voidInvoice(invoiceId, { reason }, USER_ID);

const pay = (invoiceId: number, paymentAmount: number) =>
  InvoiceService.payInvoice(
    { invoiceId, paymentAmount, paymentMethod: PaymentMethod.CASH },
    USER_ID,
  );

describe("Integration - Voiding Invoices", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should record who voided the invoice, when, and why", async () => {
    const { invoice } = await newInvoice();

    await voidInvoice(invoice.invoiceId);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.VOID);
    expect(saved?.voidReason).toBe("Wrong customer billed");
    expect(saved?.voidedAt).toBeTruthy();
    expect(saved?.voidedByUser?.userId).toBe(USER_ID);
    expect(saved?.voidedByUser).not.toHaveProperty("passwordHash");
  });

  it("should keep the amount and orders on the voided invoice as a record", async () => {
    const { invoice, order } = await newInvoice();

    await voidInvoice(invoice.invoiceId);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.amount).toBe(order.totalAmount);
    expect(saved?.invoiceDetails.map((d) => d.orderId)).toEqual([
      order.orderId,
    ]);
  });

  it("should require a reason", async () => {
    const { invoice } = await newInvoice();

    await expect(voidInvoice(invoice.invoiceId, "   ")).rejects.toThrow();

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.UNPAID);
  });

  describe("invoices that can't be voided", () => {
    it("should refuse a partly paid invoice", async () => {
      const { invoice } = await newInvoice();
      await pay(invoice.invoiceId, 1);

      await expect(voidInvoice(invoice.invoiceId)).rejects.toThrow(
        /has payments/,
      );
    });

    it("should refuse a paid invoice", async () => {
      const { invoice, order } = await newInvoice();
      await pay(invoice.invoiceId, order.totalAmount);

      await expect(voidInvoice(invoice.invoiceId)).rejects.toThrow(
        /has payments/,
      );
    });

    it("should refuse an invoice that's already void", async () => {
      const { invoice } = await newInvoice();
      await voidInvoice(invoice.invoiceId);

      await expect(voidInvoice(invoice.invoiceId)).rejects.toThrow(
        /already void/,
      );
    });

    it("should report a missing invoice", async () => {
      await expect(voidInvoice(999999)).rejects.toThrow(/not found/);
    });
  });

  it("should refuse payment on a voided invoice", async () => {
    const { invoice } = await newInvoice();
    await voidInvoice(invoice.invoiceId);

    await expect(pay(invoice.invoiceId, 1)).rejects.toThrow(/voided/);
  });

  describe("orders on a voided invoice", () => {
    it("should stay unpaid", async () => {
      const { invoice, order } = await newInvoice();
      await voidInvoice(invoice.invoiceId);

      const saved = await OrderService.get(order.orderId);
      expect(saved?.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it("should be billable again, and still only once", async () => {
      const { invoice, order } = await newInvoice();
      await voidInvoice(invoice.invoiceId);

      const replacement = await invoiceOrders([order.orderId]);
      expect(replacement.status).toBe(InvoiceStatus.UNPAID);

      await expect(invoiceOrders([order.orderId])).rejects.toThrow(
        /already on an invoice/,
      );
    });

    it("should be blocked by the database from two active invoices", async () => {
      const { invoice, order } = await newInvoice();

      await expect(
        InvoiceDetail.create({
          invoiceId: invoice.invoiceId,
          orderId: order.orderId,
        }),
      ).rejects.toThrow();
    });

    it("should reappear in the invoice order list", async () => {
      const { invoice, order } = await newInvoice();
      const list = async () => {
        const { rows } = await OrderService.getAll({
          limit: 1000,
          query: {
            isInvoice: true,
            customerId: CUSTOMER_ID,
            paymentStatus: PaymentStatus.UNPAID,
          },
        });
        return rows.map((row: any) => row.orderId);
      };

      expect(await list()).not.toContain(order.orderId);
      await voidInvoice(invoice.invoiceId);
      expect(await list()).toContain(order.orderId);
    });

    it("should be payable and cancellable directly again", async () => {
      const first = await newInvoice();
      await voidInvoice(first.invoice.invoiceId);
      const paid = await OrderService.makePayment(
        { paymentMethod: PaymentMethod.CASH },
        first.order.orderId,
      );
      expect(paid.paymentStatus).toBe(PaymentStatus.PAID);

      const second = await newInvoice();
      await voidInvoice(second.invoice.invoiceId);
      const cancelled = await OrderService.updateStatus(
        second.order.orderId,
        OrderStatus.CANCELLED,
        { userId: USER_ID },
      );
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    });
  });

  it("should drop voided invoices from the unpaid total", async () => {
    const before = await InvoiceService.getAll({ limit: 1 });
    const { invoice, order } = await newInvoice();
    const during = await InvoiceService.getAll({ limit: 1 });
    expect(during.summary.totalUnpaid.value).toBeCloseTo(
      before.summary.totalUnpaid.value + order.totalAmount,
      2,
    );

    await voidInvoice(invoice.invoiceId);

    const after = await InvoiceService.getAll({ limit: 1 });
    expect(after.summary.totalUnpaid.value).toBeCloseTo(
      before.summary.totalUnpaid.value,
      2,
    );
  });

  it("should not let a voided invoice block deleting the customer", async () => {
    const customer = await CustomerService.create({
      name: "Void Then Delete",
      address: "123 Test Street",
      phone: "",
    });
    const order = await OrderService.create(
      {
        customerId: customer!.customerId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        items: [{ productId: 1, quantity: 1 }],
      } as any,
      USER_ID,
    );
    const invoice = await InvoiceService.create(
      {
        customerId: customer!.customerId,
        status: InvoiceStatus.UNPAID,
        items: [order!.orderId],
      },
      USER_ID,
    );

    await voidInvoice(invoice.invoiceId);
    await OrderService.updateStatus(order!.orderId, OrderStatus.CANCELLED, {
      userId: USER_ID,
    });

    await expect(CustomerService.delete(customer!.customerId)).resolves.toBe(
      true,
    );
  });

  describe("voidInvoiceAction", () => {
    const signInAs = (role: UserRole) =>
      vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
        user: { userId: USER_ID, name: "Test", username: "test", role },
      });
    const input = { reason: "Billed in error" };

    it.each([UserRole.ADMIN, UserRole.MANAGER])("should allow %s", async (role) => {
      const { invoice } = await newInvoice();
      signInAs(role);

      const res = await voidInvoiceAction(invoice.invoiceId, input);

      expect(res.success).toBe(true);
    });

    it.each([UserRole.CASHIER, UserRole.DELIVERY])(
      "should refuse %s",
      async (role) => {
        const { invoice } = await newInvoice();
        signInAs(role);

        const res = await voidInvoiceAction(invoice.invoiceId, input);

        expect(res).toMatchObject({
          error: expect.stringMatching(/Forbidden/),
        });
        const saved = await InvoiceService.get(invoice.invoiceId);
        expect(saved?.status).toBe(InvoiceStatus.UNPAID);
      },
    );

    it("should return a field error for a missing reason", async () => {
      const { invoice } = await newInvoice();
      signInAs(UserRole.ADMIN);

      const res = await voidInvoiceAction(invoice.invoiceId, { reason: "" });

      expect(res.success).toBe(false);
      expect((res as any).fieldErrors.reason).toBeDefined();
    });
  });
});
