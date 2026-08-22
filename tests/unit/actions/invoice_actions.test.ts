import { describe, expect, it, vi } from "vitest";
import * as authContext from "../../../src/backend/auth/context";
import { InvoiceService } from "../../../src/backend/services/invoice.service";
import { InvoiceStatus, PaymentMethod, UserRole } from "../../../src/lib/definitions";
import {
  createInvoiceAction,
  makeInvoicePaymentAction,
} from "../../../src/backend/actions/invoice.actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../../src/backend/db/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/backend/db/database")>();
  return {
    ...actual,
    initDatabase: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Unit - Invoice Server Actions", () => {
  it("should fail createInvoiceAction if user role lacks CREATE_INVOICE permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 4, name: "Delivery", role: UserRole.DELIVERY },
    } as any);

    const res = await createInvoiceAction({
      customerId: 1,
      status: InvoiceStatus.UNPAID,
      items: [100],
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Forbidden/i);
    }
  });

  it("should delegate createInvoiceAction to InvoiceService.create when authorized", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(InvoiceService, "create").mockResolvedValue({ invoiceId: 50, status: InvoiceStatus.UNPAID } as any);

    const res = await createInvoiceAction({
      customerId: 1,
      status: InvoiceStatus.UNPAID,
      items: [100],
    });

    expect(res.success).toBe(true);
    expect(InvoiceService.create).toHaveBeenCalledWith(
      { customerId: 1, status: InvoiceStatus.UNPAID, items: [100] },
      1,
    );
  });

  it("should delegate makeInvoicePaymentAction to InvoiceService.payInvoice", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(InvoiceService, "payInvoice").mockResolvedValue({ invoiceId: 50, status: InvoiceStatus.PAID } as any);

    const res = await makeInvoicePaymentAction({
      invoiceId: 50,
      paymentAmount: 500,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(res.success).toBe(true);
    expect(InvoiceService.payInvoice).toHaveBeenCalledWith(
      { invoiceId: 50, paymentAmount: 500, paymentMethod: PaymentMethod.CASH },
      1,
    );
  });
});
