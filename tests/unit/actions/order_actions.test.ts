import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import * as authContext from "../../../src/backend/auth/context";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { OrderService } from "../../../src/backend/services/order.service";
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from "../../../src/lib/definitions";
import {
  createOrderAction,
  getOrdersAction,
  makePaymentAction,
  updateOrderAction,
  updateOrderStatusAction,
} from "../../../src/backend/actions/order.actions";

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

describe("Unit - Order Server Actions", () => {
  it("should fail getOrdersAction if user is unauthenticated", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue(null);

    const res = await getOrdersAction({});
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Unauthorized/i);
    }
  });

  it("should execute getOrdersAction when user has VIEW_ORDERS permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(OrderService, "getAll").mockResolvedValue({ orders: [], total: 0 } as any);

    const res = await getOrdersAction({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ orders: [], total: 0 });
    }
  });

  it("should fail createOrderAction when user lacks CREATE_ORDER permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 2, name: "Delivery", role: UserRole.DELIVERY },
    } as any);

    const res = await createOrderAction({
      customerId: 1,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 2 }],
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Forbidden/i);
    }
  });

  it("should successfully create order via createOrderAction for authorized user", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(CustomerService, "get").mockResolvedValue({ customerId: 1, name: "Regular" } as any);
    vi.spyOn(OrderService, "create").mockResolvedValue({ orderId: 101, totalAmount: 100 } as any);

    const res = await createOrderAction({
      customerId: 1,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 2, unitPrice: 50 }],
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ orderId: 101, totalAmount: 100 });
    }
    expect(revalidatePath).toHaveBeenCalledWith("/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/customers/1");
  });

  it("should fail makePaymentAction when input fails PaymentSchema", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);

    const res = await makePaymentAction({ paymentMethod: "INVALID_METHOD" as any }, 101);
    expect(res.success).toBe(false);
  });

  it("should call OrderService.makePayment in makePaymentAction on valid input", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(OrderService, "makePayment").mockResolvedValue({ success: true, paymentStatus: PaymentStatus.PAID } as any);

    const res = await makePaymentAction(
      { paymentMethod: PaymentMethod.CASH, paymentNotes: "Paid" },
      101,
    );

    expect(res.success).toBe(true);
    expect(OrderService.makePayment).toHaveBeenCalledWith(
      { paymentMethod: PaymentMethod.CASH, paymentNotes: "Paid" },
      101,
      1,
    );
  });

  it("should fail updateOrderAction when user lacks UPDATE_ORDER permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 2, name: "Delivery", role: UserRole.DELIVERY },
    } as any);
    const update = vi.spyOn(OrderService, "update");

    const res = await updateOrderAction(101, {
      items: [{ productId: 1, quantity: 2, discount: 0 }],
    });

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/Forbidden/i);
    expect(update).not.toHaveBeenCalled();
  });

  it("should validate the second argument of updateOrderAction and call OrderService.update", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 3, name: "Cashier", role: UserRole.CASHIER },
    } as any);
    const update = vi
      .spyOn(OrderService, "update")
      .mockResolvedValue({ orderId: 101, customerId: 7 } as any);

    const invalid = await updateOrderAction(101, { items: [] });
    expect(invalid.success).toBe(false);
    expect(update).not.toHaveBeenCalled();

    const input = {
      items: [{ productId: 1, quantity: 2, discount: 0 }],
      surcharge: 5,
    };
    const res = await updateOrderAction(101, input);

    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledWith(101, input);
    expect(revalidatePath).toHaveBeenCalledWith("/orders/101");
    expect(revalidatePath).toHaveBeenCalledWith("/customers/7");
  });

  it("should update order status and log current user in updateOrderStatusAction", async () => {
    const testUser = { userId: 1, name: "Admin", role: UserRole.ADMIN };
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: testUser,
    } as any);
    const consoleSpy = vi.spyOn(console, "log");
    vi.spyOn(OrderService, "updateStatus").mockResolvedValue({
      orderId: 101,
      status: OrderStatus.PENDING,
    } as any);

    const res = await updateOrderStatusAction(101, OrderStatus.PENDING);

    expect(res.success).toBe(true);
    expect(OrderService.updateStatus).toHaveBeenCalledWith(
      101,
      OrderStatus.PENDING,
      testUser,
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Updating order #101 status to PENDING by user:"),
      testUser,
    );
    consoleSpy.mockRestore();
  });
});
