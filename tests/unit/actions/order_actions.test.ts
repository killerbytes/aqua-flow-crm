import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOrderAction,
  getOrdersAction,
  makePaymentAction,
  reverseOrderPaymentAction,
  updateOrderAction,
  updateOrderStatusAction,
} from "../../../src/backend/actions/order.actions";
import { OrderService } from "../../../src/backend/services/order.service";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../../src/lib/definitions";
import { sessionUser, signInAs } from "../../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/backend/services/order.service");

type Resolved<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

const items = [{ productId: 1, quantity: 2, discount: 0 }];

// Who may run each action is covered in action_permissions.test.ts, and
// voiding in page_permissions.test.ts.
describe("Unit - Order Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(UserRole.CASHIER, 3);
  });

  it("should pass the filters to the order list", async () => {
    const page = { rows: [] } as unknown as Resolved<typeof OrderService.getAll>;
    vi.mocked(OrderService.getAll).mockResolvedValue(page);
    const filters = { page: 2, query: { status: OrderStatus.PENDING } };

    expect(await getOrdersAction(filters)).toEqual({ success: true, data: page });
    expect(OrderService.getAll).toHaveBeenCalledWith(filters);
  });

  describe("createOrderAction", () => {
    const input = {
      customerId: 4,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items,
    };

    it("should create through createForStaff, as the signed-in user", async () => {
      const res = await createOrderAction(input);

      expect(res.success).toBe(true);
      // createForStaff is what stops a request choosing its own status or date.
      expect(OrderService.createForStaff).toHaveBeenCalledWith(input, 3);
      expect(OrderService.create).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/orders");
      expect(revalidatePath).toHaveBeenCalledWith("/customers/4");
    });

    it.each([
      ["no items", { ...input, items: [] }],
      ["a zero quantity", { ...input, items: [{ ...items[0], quantity: 0 }] }],
      ["a negative surcharge", { ...input, surcharge: -5 }],
      ["no customer", { ...input, customerId: 0 }],
    ])("should refuse an order with %s", async (_, invalid) => {
      const res = await createOrderAction(invalid);

      expect(res).toMatchObject({ success: false, error: "Validation failed" });
      expect(OrderService.createForStaff).not.toHaveBeenCalled();
    });
  });

  describe("updateOrderAction", () => {
    it("should validate the form, not the id, and refresh the order and its customer", async () => {
      vi.mocked(OrderService.update).mockResolvedValue({
        orderId: 101,
        customerId: 7,
      } as Resolved<typeof OrderService.update>);
      const input = { items, surcharge: 5 };

      const res = await updateOrderAction(101, input);

      expect(res.success).toBe(true);
      expect(OrderService.update).toHaveBeenCalledWith(101, input);
      expect(revalidatePath).toHaveBeenCalledWith("/orders/101");
      expect(revalidatePath).toHaveBeenCalledWith("/customers/7");
    });

    it("should refuse an edit that leaves the order empty", async () => {
      const res = await updateOrderAction(101, { items: [] });

      expect(res).toMatchObject({ success: false, error: "Validation failed" });
      expect(OrderService.update).not.toHaveBeenCalled();
    });
  });

  describe("makePaymentAction", () => {
    it("should take payment as the signed-in user, with a numeric order id", async () => {
      const input = { paymentMethod: PaymentMethod.CASH, paymentNotes: "Paid" };

      const res = await makePaymentAction(input, "101");

      expect(res.success).toBe(true);
      expect(OrderService.makePayment).toHaveBeenCalledWith(input, 101, 3);
      expect(revalidatePath).toHaveBeenCalledWith("/orders");
    });

    it("should refuse an unknown payment method", async () => {
      const res = await makePaymentAction(
        { paymentMethod: "BITCOIN" as PaymentMethod },
        101,
      );

      expect(res).toMatchObject({ success: false, error: "Validation failed" });
      expect(OrderService.makePayment).not.toHaveBeenCalled();
    });
  });

  it("should pass the signed-in user to a status update, to record who delivered", async () => {
    signInAs(UserRole.DELIVERY, 8);

    const res = await updateOrderStatusAction(101, OrderStatus.DELIVERED);

    expect(res.success).toBe(true);
    expect(OrderService.updateStatus).toHaveBeenCalledWith(
      101,
      OrderStatus.DELIVERED,
      sessionUser(UserRole.DELIVERY, 8),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/orders");
  });

  it("should reverse a payment as the signed-in user and refresh its order", async () => {
    signInAs(UserRole.MANAGER, 2);
    vi.mocked(OrderService.reversePayment).mockResolvedValue({
      orderId: 55,
    } as Resolved<typeof OrderService.reversePayment>);

    const res = await reverseOrderPaymentAction(9, { reason: "Wrong order" });

    expect(res.success).toBe(true);
    expect(OrderService.reversePayment).toHaveBeenCalledWith(
      9,
      { reason: "Wrong order" },
      2,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/orders/55");
  });

  it("should need a reason to reverse a payment", async () => {
    signInAs(UserRole.MANAGER);

    const res = await reverseOrderPaymentAction(9, { reason: "  " });

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    expect(OrderService.reversePayment).not.toHaveBeenCalled();
  });
});
