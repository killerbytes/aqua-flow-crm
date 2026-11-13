import { describe, expect, it, vi } from "vitest";
import * as authContext from "../../../src/backend/auth/context";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { UserRole } from "../../../src/lib/definitions";
import {
  createCustomerAction,
  deleteCustomerAction,
  deleteSpecialPricingAction,
  updateCustomerAction,
} from "../../../src/backend/actions/customer.actions";

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

describe("Unit - Customer Server Actions", () => {
  it("should create a customer successfully via createCustomerAction", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(CustomerService, "create").mockResolvedValue({ customerId: 10, name: "Jane Smith" } as any);

    const res = await createCustomerAction({
      name: "Jane Smith",
      address: "456 Oak Avenue",
      phone: "09181234567",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ customerId: 10, name: "Jane Smith" });
    }
  });

  it("should fail deleteCustomerAction if non-admin user attempts deletion", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 3, name: "Cashier", role: UserRole.CASHIER },
    } as any);

    const res = await deleteCustomerAction(10);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Forbidden/i);
    }
  });

  it("should allow admin user to delete customer via deleteCustomerAction", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(CustomerService, "delete").mockResolvedValue({ success: true } as any);

    const res = await deleteCustomerAction(10);
    expect(res.success).toBe(true);
  });

  it("should allow a cashier to delete a special discount", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 3, name: "Cashier", role: UserRole.CASHIER },
    } as any);
    const spy = vi
      .spyOn(CustomerService, "deleteSpecialPricing")
      .mockResolvedValue({ pricingId: 4, customerId: 10 });

    const res = await deleteSpecialPricingAction(4);
    expect(res.success).toBe(true);
    expect(spy).toHaveBeenCalledWith(4);
  });

  it("should refuse a delivery user deleting a special discount", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 4, name: "Rider", role: UserRole.DELIVERY },
    } as any);
    const spy = vi.spyOn(CustomerService, "deleteSpecialPricing");
    spy.mockClear();

    const res = await deleteSpecialPricingAction(4);
    expect(res.success).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
