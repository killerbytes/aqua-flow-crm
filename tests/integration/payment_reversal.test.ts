import { beforeAll, describe, expect, it, vi } from "vitest";
import { reversePaymentAction } from "../../src/backend/actions/invoice.actions";
import * as authContext from "../../src/backend/auth/context";
import {
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

const CUSTOMER_ID = 3;
const USER_ID = 1;

const newInvoice = async () => {
  const order = (await OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 2 }],
    } as any,
    USER_ID,
  ))!;
  const invoice = await InvoiceService.create(
    { customerId: CUSTOMER_ID, status: InvoiceStatus.UNPAID, items: [order.orderId] },
    USER_ID,
  );
  return { order, invoice };
};

const pay = async (invoiceId: number, paymentAmount: number) => {
  await InvoiceService.payInvoice(
    { invoiceId, paymentAmount, paymentMethod: PaymentMethod.CASH },
    USER_ID,
  );
  const payments = await InvoiceService.getPayments(invoiceId);
  return payments[payments.length - 1];
};

const reverse = (paymentId: number, reason = "Wrong amount entered") =>
  InvoiceService.reversePayment(paymentId, { reason }, USER_ID);

describe("Integration - Reversing Payments", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should keep the payment on record, marked with who, when, and why", async () => {
    const { invoice } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);

    await reverse(payment.id);

    const [saved] = await InvoiceService.getPayments(invoice.invoiceId);
    expect(saved.paymentAmount).toBe(10);
    expect(saved.reversedAt).toBeTruthy();
    expect(saved.reversalReason).toBe("Wrong amount entered");
    expect(saved.reversedByUser?.userId).toBe(USER_ID);
    expect(saved.reversedByUser).not.toHaveProperty("passwordHash");
  });

  it("should take a partly paid invoice back to unpaid", async () => {
    const { invoice } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);

    await reverse(payment.id);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.UNPAID);
  });

  it("should leave an invoice partly paid when other payments remain", async () => {
    const { invoice } = await newInvoice();
    await pay(invoice.invoiceId, 10);
    const mistake = await pay(invoice.invoiceId, 5);

    await reverse(mistake.id);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.PARTIAL);
  });

  it("should reopen a paid invoice and mark its orders unpaid again", async () => {
    const { invoice, order } = await newInvoice();
    const payment = await pay(invoice.invoiceId, order.totalAmount);
    expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(PaymentStatus.PAID);

    await reverse(payment.id);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.UNPAID);
    expect(saved?.paymentDate).toBeNull();
    expect((await OrderService.get(order.orderId))?.paymentStatus).toBe(PaymentStatus.UNPAID);
  });

  it("should let the correct amount be paid afterwards", async () => {
    const { invoice, order } = await newInvoice();
    const wrong = await pay(invoice.invoiceId, order.totalAmount - 1);
    await reverse(wrong.id);

    // The reversed amount no longer counts, so the full amount fits again.
    await pay(invoice.invoiceId, order.totalAmount);

    const saved = await InvoiceService.get(invoice.invoiceId);
    expect(saved?.status).toBe(InvoiceStatus.PAID);
  });

  it("should not let a reversed payment be reversed twice", async () => {
    const { invoice } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);
    await reverse(payment.id);

    await expect(reverse(payment.id)).rejects.toThrow(/already been reversed/);
  });

  it("should require a reason", async () => {
    const { invoice } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);

    await expect(reverse(payment.id, "  ")).rejects.toThrow();
    const [saved] = await InvoiceService.getPayments(invoice.invoiceId);
    expect(saved.reversedAt).toBeNull();
  });

  it("should report a missing payment", async () => {
    await expect(reverse(999999)).rejects.toThrow("Payment not found");
  });

  it("should allow voiding once every payment is reversed", async () => {
    const { invoice } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);
    await expect(
      InvoiceService.voidInvoice(invoice.invoiceId, { reason: "Wrong customer" }, USER_ID),
    ).rejects.toThrow(/has payments/);

    await reverse(payment.id);

    const voided = await InvoiceService.voidInvoice(
      invoice.invoiceId,
      { reason: "Wrong customer" },
      USER_ID,
    );
    expect(voided.status).toBe(InvoiceStatus.VOID);
  });

  it("should leave reversed payments out of the unpaid totals", async () => {
    const { invoice, order } = await newInvoice();
    const payment = await pay(invoice.invoiceId, 10);
    const before = {
      invoices: (await InvoiceService.getAll({ limit: 1 })).summary.totalUnpaid.value,
      dashboard: (await DashboardService.getSummary()).receivables.openInvoices.amount,
    };

    await reverse(payment.id);

    const after = {
      invoices: (await InvoiceService.getAll({ limit: 1 })).summary.totalUnpaid.value,
      dashboard: (await DashboardService.getSummary()).receivables.openInvoices.amount,
    };
    expect(after.invoices - before.invoices).toBeCloseTo(10, 2);
    expect(after.dashboard - before.dashboard).toBeCloseTo(10, 2);
    void order;
  });

  describe("reversePaymentAction", () => {
    const signInAs = (role: UserRole) =>
      vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
        user: { userId: USER_ID, name: "Test", username: "test", role },
      });

    it.each([UserRole.ADMIN, UserRole.MANAGER])("should allow %s", async (role) => {
      const { invoice } = await newInvoice();
      const payment = await pay(invoice.invoiceId, 10);
      signInAs(role);

      const res = await reversePaymentAction(payment.id, { reason: "Duplicate entry" });
      expect(res.success).toBe(true);
    });

    it.each([UserRole.CASHIER, UserRole.DELIVERY])("should refuse %s", async (role) => {
      const { invoice } = await newInvoice();
      const payment = await pay(invoice.invoiceId, 10);
      signInAs(role);

      const res = await reversePaymentAction(payment.id, { reason: "Duplicate entry" });
      expect(res).toMatchObject({ error: expect.stringMatching(/Forbidden/) });
      const [saved] = await InvoiceService.getPayments(invoice.invoiceId);
      expect(saved.reversedAt).toBeNull();
    });

    it("should return a field error for a missing reason", async () => {
      const { invoice } = await newInvoice();
      const payment = await pay(invoice.invoiceId, 10);
      signInAs(UserRole.ADMIN);

      const res = await reversePaymentAction(payment.id, { reason: "" });
      expect((res as any).fieldErrors?.reason).toBeDefined();
    });
  });
});
