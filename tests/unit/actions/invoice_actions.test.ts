import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInvoiceAction,
  makeInvoicePaymentAction,
  reversePaymentAction,
  voidInvoiceAction,
} from "../../../src/backend/actions/invoice.actions";
import { InvoiceService } from "../../../src/backend/services/invoice.service";
import {
  InvoiceStatus,
  PaymentMethod,
  UserRole,
} from "../../../src/lib/definitions";
import { signInAs } from "../../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/backend/services/invoice.service");

type Resolved<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

// Who may run each action is covered in action_permissions.test.ts. Voiding and
// reversing against a real database are in tests/integration.
describe("Unit - Invoice Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(UserRole.MANAGER, 6);
  });

  it("should create an invoice as the signed-in user", async () => {
    const input = { customerId: 1, status: InvoiceStatus.UNPAID, items: [100] };

    const res = await createInvoiceAction(input);

    expect(res.success).toBe(true);
    expect(InvoiceService.create).toHaveBeenCalledWith(input, 6);
    expect(revalidatePath).toHaveBeenCalledWith("/orders");
  });

  it("should refuse an invoice with no orders", async () => {
    const res = await createInvoiceAction({
      customerId: 1,
      status: InvoiceStatus.UNPAID,
      items: [],
    });

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    expect(InvoiceService.create).not.toHaveBeenCalled();
  });

  it("should take an invoice payment as the signed-in user and refresh the invoice", async () => {
    const input = {
      invoiceId: 50,
      paymentAmount: 500,
      paymentMethod: PaymentMethod.CASH,
    };

    const res = await makeInvoicePaymentAction(input);

    expect(res.success).toBe(true);
    expect(InvoiceService.payInvoice).toHaveBeenCalledWith(input, 6);
    expect(revalidatePath).toHaveBeenCalledWith("/invoices");
    expect(revalidatePath).toHaveBeenCalledWith("/invoices/50");
  });

  it("should void as the signed-in user and refresh the invoice", async () => {
    const res = await voidInvoiceAction(50, { reason: "Wrong customer" });

    expect(res.success).toBe(true);
    expect(InvoiceService.voidInvoice).toHaveBeenCalledWith(
      50,
      { reason: "Wrong customer" },
      6,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/invoices/50");
  });

  it("should refresh the invoice a reversed payment belonged to", async () => {
    vi.mocked(InvoiceService.reversePayment).mockResolvedValue({
      invoiceId: 77,
    } as Resolved<typeof InvoiceService.reversePayment>);

    const res = await reversePaymentAction(9, { reason: "Typed 5000 for 500" });

    expect(res.success).toBe(true);
    expect(InvoiceService.reversePayment).toHaveBeenCalledWith(
      9,
      { reason: "Typed 5000 for 500" },
      6,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/invoices/77");
  });

  it.each([
    ["void", () => voidInvoiceAction(50, { reason: "no" })],
    ["reversal", () => reversePaymentAction(9, { reason: "   " })],
  ])("should need a real reason for a %s", async (_, run) => {
    const res = await run();

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    if (!res.success) expect(res.fieldErrors?.reason).toBeDefined();
    expect(InvoiceService.voidInvoice).not.toHaveBeenCalled();
    expect(InvoiceService.reversePayment).not.toHaveBeenCalled();
  });
});
