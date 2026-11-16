import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authActions from "../../../src/backend/actions/auth.actions";
import * as customerActions from "../../../src/backend/actions/customer.actions";
import * as invoiceActions from "../../../src/backend/actions/invoice.actions";
import * as orderActions from "../../../src/backend/actions/order.actions";
import * as productActions from "../../../src/backend/actions/product.actions";
import type { ActionResponse } from "../../../src/backend/lib/safe-action";
import { AuthService } from "../../../src/backend/services/auth.service";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { EquipmentService } from "../../../src/backend/services/equipment.service";
import { InventoryService } from "../../../src/backend/services/inventory.service";
import { InvoiceService } from "../../../src/backend/services/invoice.service";
import { OrderService } from "../../../src/backend/services/order.service";
import { ProductService } from "../../../src/backend/services/product.service";
import {
  EquipmentActionType,
  InventoryAdjustmentType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../../../src/lib/definitions";
import { signInAs, signOut } from "../../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Every service method is replaced, so no action here reaches a database. A
// handler may still fail on the empty result, which is fine: what matters is
// whether the service was reached.
vi.mock("../../../src/backend/services/auth.service");
vi.mock("../../../src/backend/services/customer.service");
vi.mock("../../../src/backend/services/equipment.service");
vi.mock("../../../src/backend/services/inventory.service");
vi.mock("../../../src/backend/services/invoice.service");
vi.mock("../../../src/backend/services/order.service");
vi.mock("../../../src/backend/services/product.service");

const { ADMIN, MANAGER, CASHIER, DELIVERY } = UserRole;
const ADMIN_ONLY = [ADMIN];
const MANAGERS = [ADMIN, MANAGER];
const OFFICE = [ADMIN, MANAGER, CASHIER];
const EVERYONE = [ADMIN, MANAGER, CASHIER, DELIVERY];

const reason = { reason: "Entered twice" };
const items = [{ productId: 1, quantity: 1, discount: 0 }];
const customer = { name: "Name", address: "Address 123", phone: "" };
const user = { name: "New User", username: "newuser", role: CASHIER };
const password = { password: "pass1234", confirmPassword: "pass1234" };

interface Case {
  /** Who may run the action. Written out here, not read from the role table. */
  roles: UserRole[];
  /** Calls the action with input that passes its validation. */
  run: () => Promise<ActionResponse<unknown>>;
  /** The service method the action exists to call. */
  reaches: (...args: never[]) => unknown;
}

const ACTIONS: Record<string, Case> = {
  // Users
  createUserAction: {
    roles: ADMIN_ONLY,
    run: () => authActions.createUserAction({ ...user, ...password }),
    reaches: AuthService.createUser,
  },
  updateUserAction: {
    roles: ADMIN_ONLY,
    run: () => authActions.updateUserAction(2, user),
    reaches: AuthService.updateUser,
  },
  changePasswordAction: {
    roles: ADMIN_ONLY,
    run: () => authActions.changePasswordAction(2, password),
    reaches: AuthService.changePassword,
  },

  // Customers
  createCustomerAction: {
    roles: OFFICE,
    run: () => customerActions.createCustomerAction(customer),
    reaches: CustomerService.create,
  },
  updateCustomerAction: {
    roles: OFFICE,
    run: () => customerActions.updateCustomerAction(1, customer),
    reaches: CustomerService.update,
  },
  deleteCustomerAction: {
    roles: MANAGERS,
    run: () => customerActions.deleteCustomerAction(1),
    reaches: CustomerService.delete,
  },
  lookupCustomerAction: {
    roles: OFFICE,
    run: () => customerActions.lookupCustomerAction("juan"),
    reaches: CustomerService.lookup,
  },
  logEquipmentAction: {
    roles: OFFICE,
    run: () =>
      customerActions.logEquipmentAction({
        customerId: 1,
        productId: 1,
        actionType: EquipmentActionType.ISSUE,
        quantity: 1,
      }),
    reaches: EquipmentService.logEquipment,
  },
  setSpecialPricingAction: {
    roles: OFFICE,
    run: () =>
      customerActions.setSpecialPricingAction({
        customerId: 1,
        productId: 1,
        discountAmount: 5,
      }),
    reaches: CustomerService.setSpecialPricing,
  },
  deleteSpecialPricingAction: {
    roles: OFFICE,
    run: () => customerActions.deleteSpecialPricingAction(1),
    reaches: CustomerService.deleteSpecialPricing,
  },

  // Products and stock
  getProductsAction: {
    roles: OFFICE,
    run: () => productActions.getProductsAction(),
    reaches: ProductService.getAll,
  },
  createProductAction: {
    roles: MANAGERS,
    run: () => productActions.createProductAction({ name: "Jug", unitPrice: 10 }),
    reaches: ProductService.create,
  },
  updateProductAction: {
    roles: MANAGERS,
    run: () => productActions.updateProductAction(1, { name: "Jug" }),
    reaches: ProductService.update,
  },
  deleteProductAction: {
    roles: MANAGERS,
    run: () => productActions.deleteProductAction(1),
    reaches: ProductService.delete,
  },
  createAdjustmentAction: {
    roles: MANAGERS,
    run: () =>
      productActions.createAdjustmentAction({
        productId: 1,
        adjustmentType: InventoryAdjustmentType.STOCK_IN,
        quantity: 1,
      }),
    reaches: InventoryService.createAdjustment,
  },

  // Orders
  getOrdersAction: {
    roles: EVERYONE,
    run: () => orderActions.getOrdersAction({}),
    reaches: OrderService.getAll,
  },
  getWalkInCustomerAction: {
    roles: OFFICE,
    run: () => orderActions.getWalkInCustomerAction(),
    reaches: CustomerService.getOrCreateWalkIn,
  },
  createOrderAction: {
    roles: OFFICE,
    run: () =>
      orderActions.createOrderAction({
        customerId: 1,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        items,
      }),
    reaches: OrderService.createForStaff,
  },
  updateOrderAction: {
    roles: OFFICE,
    run: () => orderActions.updateOrderAction(1, { items }),
    reaches: OrderService.update,
  },
  updateOrderStatusAction: {
    roles: EVERYONE,
    run: () =>
      orderActions.updateOrderStatusAction(1, OrderStatus.OUT_FOR_DELIVERY),
    reaches: OrderService.updateStatus,
  },
  voidOrderAction: {
    roles: OFFICE,
    run: () => orderActions.voidOrderAction(1, reason),
    reaches: OrderService.voidOrder,
  },
  makePaymentAction: {
    roles: OFFICE,
    run: () =>
      orderActions.makePaymentAction({ paymentMethod: PaymentMethod.CASH }, 1),
    reaches: OrderService.makePayment,
  },
  reverseOrderPaymentAction: {
    roles: MANAGERS,
    run: () => orderActions.reverseOrderPaymentAction(1, reason),
    reaches: OrderService.reversePayment,
  },

  // Invoices
  createInvoiceAction: {
    roles: OFFICE,
    run: () =>
      invoiceActions.createInvoiceAction({
        customerId: 1,
        status: InvoiceStatus.UNPAID,
        items: [1],
      }),
    reaches: InvoiceService.create,
  },
  makeInvoicePaymentAction: {
    roles: OFFICE,
    run: () =>
      invoiceActions.makeInvoicePaymentAction({
        invoiceId: 1,
        paymentAmount: 1,
        paymentMethod: PaymentMethod.CASH,
      }),
    reaches: InvoiceService.payInvoice,
  },
  voidInvoiceAction: {
    roles: MANAGERS,
    run: () => invoiceActions.voidInvoiceAction(1, reason),
    reaches: InvoiceService.voidInvoice,
  },
  reversePaymentAction: {
    roles: MANAGERS,
    run: () => invoiceActions.reversePaymentAction(1, reason),
    reaches: InvoiceService.reversePayment,
  },
};

/** loginAction is how a session starts, so it has no permission to check. */
const PUBLIC_ACTIONS = ["loginAction"];

describe("Unit - Server Action Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list every action, so a new one can't ship without its roles", () => {
    const exported = [
      authActions,
      customerActions,
      invoiceActions,
      orderActions,
      productActions,
    ].flatMap((module) =>
      Object.entries(module)
        .filter(([, value]) => typeof value === "function")
        .map(([name]) => name),
    );

    expect(exported.sort()).toEqual(
      [...Object.keys(ACTIONS), ...PUBLIC_ACTIONS].sort(),
    );
  });

  const cases = Object.entries(ACTIONS).flatMap(([name, action]) =>
    EVERYONE.map((role) => ({
      name,
      role,
      allowed: action.roles.includes(role),
      action,
    })),
  );

  it.each(cases.filter((c) => c.allowed))(
    "should let $role run $name",
    async ({ role, action }) => {
      signInAs(role);

      const res = await action.run();

      expect(action.reaches).toHaveBeenCalledTimes(1);
      if (!res.success) expect(res.error).not.toMatch(/Forbidden|Unauthorized/);
    },
  );

  it.each(cases.filter((c) => !c.allowed))(
    "should refuse $role running $name",
    async ({ role, action }) => {
      signInAs(role);

      const res = await action.run();

      expect(res).toEqual({
        success: false,
        error: "Forbidden: insufficient permissions",
      });
      expect(action.reaches).not.toHaveBeenCalled();
    },
  );

  it.each(Object.entries(ACTIONS))(
    "should refuse %s without a session",
    async (_, action) => {
      signOut();

      const res = await action.run();

      expect(res).toEqual({ success: false, error: "User not authenticated" });
      expect(action.reaches).not.toHaveBeenCalled();
    },
  );
});
