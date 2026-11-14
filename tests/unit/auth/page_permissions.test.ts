import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import {
  deleteCustomerAction,
  updateCustomerAction,
} from "../../../src/backend/actions/customer.actions";
import {
  createOrderAction,
  getOrdersAction,
  makePaymentAction,
  updateOrderStatusAction,
  voidOrderAction,
} from "../../../src/backend/actions/order.actions";
import * as authContext from "../../../src/backend/auth/context";
import {
  checkPermission,
  getPageRedirect,
  PermissionAction,
} from "../../../src/backend/rbac/permissions";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { OrderService } from "../../../src/backend/services/order.service";
import { OrderStatus, UserRole } from "../../../src/lib/definitions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

const { ADMIN, MANAGER, CASHIER, DELIVERY } = UserRole;

const PAGES: Record<string, PermissionAction> = {
  "page.tsx": "VIEW_DASHBOARD",
  "customers/page.tsx": "VIEW_CUSTOMERS",
  "customers/[id]/page.tsx": "VIEW_CUSTOMERS",
  "invoices/page.tsx": "VIEW_INVOICES",
  "invoices/[id]/page.tsx": "VIEW_INVOICES",
  "invoices/[id]/print/page.tsx": "VIEW_INVOICES",
  "orders/page.tsx": "VIEW_ORDERS",
  "orders/[id]/page.tsx": "VIEW_ORDERS",
  "products/page.tsx": "VIEW_PRODUCTS",
  "reports/page.tsx": "VIEW_REPORTS",
  "reports/inactive-customers/page.tsx": "VIEW_REPORTS",
  "reports/inactive-customers/print/page.tsx": "VIEW_REPORTS",
  "reports/inactive-with-equipment/page.tsx": "VIEW_REPORTS",
  "reports/inactive-with-equipment/print/page.tsx": "VIEW_REPORTS",
  "reports/temporary-equipment/page.tsx": "VIEW_REPORTS",
  "reports/temporary-equipment/print/page.tsx": "VIEW_REPORTS",
  "reports/sales/page.tsx": "VIEW_REPORTS",
  "reports/sales/print/page.tsx": "VIEW_REPORTS",
  "reports/receivables/page.tsx": "VIEW_REPORTS",
  "reports/receivables/print/page.tsx": "VIEW_REPORTS",
  "reports/voids/page.tsx": "VIEW_REPORTS",
  "reports/voids/print/page.tsx": "VIEW_REPORTS",
  "users/page.tsx": "VIEW_USERS",
};

const PUBLIC_PAGES = ["login/page.tsx"];

/** Route Handlers outside /api, which the proxy still sends through login. */
const ROUTES: Record<string, PermissionAction> = {
  "reports/inactive-customers/csv/route.ts": "EXPORT_REPORTS",
  "reports/inactive-with-equipment/csv/route.ts": "EXPORT_REPORTS",
  "reports/temporary-equipment/csv/route.ts": "EXPORT_REPORTS",
  "reports/sales/csv/route.ts": "EXPORT_REPORTS",
  "reports/receivables/csv/route.ts": "EXPORT_REPORTS",
  "reports/voids/csv/route.ts": "EXPORT_REPORTS",
};

const findFiles = (dir: string, name: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findFiles(full, name);
    return entry.name === name ? [full] : [];
  });

describe("Unit - Page Permissions", () => {
  const appDir = path.resolve(process.cwd(), "src/app");
  const relative = (file: string) =>
    path.relative(appDir, file).split(path.sep).join("/");

  it("should list every page, so a new one can't ship unguarded", () => {
    const found = findFiles(appDir, "page.tsx").map(relative).sort();

    expect(found).toEqual([...Object.keys(PAGES), ...PUBLIC_PAGES].sort());
  });

  it("should list every route outside /api, so a new one can't ship unguarded", () => {
    const found = findFiles(appDir, "route.ts")
      .map(relative)
      .filter((file) => !file.startsWith("api/"))
      .sort();

    expect(found).toEqual(Object.keys(ROUTES).sort());
  });

  it.each(Object.entries({ ...PAGES, ...ROUTES }))(
    "should guard %s with %s",
    (page, permission) => {
      const source = fs.readFileSync(path.join(appDir, page), "utf8");
      expect(source).toContain(`requirePagePermission("${permission}")`);
    },
  );

  it.each([
    ["VIEW_USERS", [ADMIN, MANAGER]],
    ["VIEW_REPORTS", [ADMIN, MANAGER, CASHIER]],
    ["EXPORT_REPORTS", [ADMIN]],
    ["VIEW_DASHBOARD", [ADMIN, MANAGER, CASHIER]],
    ["VIEW_CUSTOMERS", [ADMIN, MANAGER, CASHIER]],
    ["VIEW_PRODUCTS", [ADMIN, MANAGER, CASHIER]],
    ["VIEW_INVOICES", [ADMIN, MANAGER, CASHIER]],
    ["VIEW_ORDERS", [ADMIN, MANAGER, CASHIER, DELIVERY]],
    ["VOID_INVOICE", [ADMIN, MANAGER]],
    ["REVERSE_PAYMENT", [ADMIN, MANAGER]],
    ["MANAGE_USERS", [ADMIN]],
    ["CREATE_USER", [ADMIN]],
  ] as [PermissionAction, UserRole[]][])(
    "should give %s to exactly %j",
    (permission, roles) => {
      const allowed = Object.values(UserRole).filter((role) =>
        checkPermission(role, permission),
      );
      expect(allowed.sort()).toEqual([...roles].sort());
    },
  );

  it("should send people who can't open a page somewhere they can", () => {
    expect(getPageRedirect(ADMIN, "VIEW_USERS")).toBeNull();
    expect(getPageRedirect(MANAGER, "VIEW_USERS")).toBeNull();
    expect(getPageRedirect(CASHIER, "VIEW_USERS")).toBe("/");
    expect(getPageRedirect(DELIVERY, "VIEW_USERS")).toBe("/orders");
  });

  it("should never redirect a role to a page it can't open", () => {
    const targets: Record<string, PermissionAction> = {
      "/": "VIEW_DASHBOARD",
      "/orders": "VIEW_ORDERS",
    };

    for (const role of Object.values(UserRole)) {
      for (const permission of Object.values(PAGES)) {
        const target = getPageRedirect(role, permission);
        if (target) {
          expect(getPageRedirect(role, targets[target])).toBeNull();
        }
      }
    }
  });

  it("should send an unrecognized role to login rather than loop", () => {
    expect(getPageRedirect("UNKNOWN" as UserRole, "VIEW_ORDERS")).toBe("/login");
  });
});

describe("Unit - Action Permissions", () => {
  const signInAs = (role: UserRole) =>
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Test", username: "test", role },
    });

  const mockStatusUpdate = () =>
    vi
      .spyOn(OrderService, "updateStatus")
      .mockResolvedValue({ orderId: 1 } as any);

  describe("Delivery staff", () => {
    it.each([
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.PENDING,
    ])("should be able to move an order to %s", async (status) => {
      signInAs(DELIVERY);
      mockStatusUpdate();

      expect((await updateOrderStatusAction(1, status)).success).toBe(true);
    });

    it("should be able to list orders", async () => {
      signInAs(DELIVERY);
      vi.spyOn(OrderService, "getAll").mockResolvedValue({ rows: [] } as any);

      expect((await getOrdersAction({})).success).toBe(true);
    });

    it("should not be able to cancel, create, or take payment", async () => {
      signInAs(DELIVERY);
      const update = mockStatusUpdate();
      update.mockClear();

      const cancel = await updateOrderStatusAction(1, OrderStatus.CANCELLED);
      expect(cancel).toMatchObject({ success: false });
      expect(update).not.toHaveBeenCalled();

      const create = await createOrderAction({
        customerId: 1,
        status: OrderStatus.PENDING,
        paymentStatus: "UNPAID",
        items: [{ productId: 1, quantity: 1, discount: 0 }],
      });
      expect(create).toMatchObject({ error: expect.stringMatching(/Forbidden/) });

      const pay = await makePaymentAction({ paymentMethod: "CASH" }, 1);
      expect(pay).toMatchObject({ error: expect.stringMatching(/Forbidden/) });
    });
  });

  describe("Voiding orders", () => {
    const mockVoid = () =>
      vi
        .spyOn(OrderService, "voidOrder")
        .mockResolvedValue({ orderId: 1, customerId: 1 } as any);

    it.each([ADMIN, MANAGER])("should be allowed for %s", async (role) => {
      signInAs(role);
      const voidOrder = mockVoid();

      const res = await voidOrderAction(1, { reason: "Entered twice" });
      expect(res.success).toBe(true);
      expect(voidOrder).toHaveBeenCalledWith(1, { reason: "Entered twice" }, 1);
    });

    it.each([CASHIER, DELIVERY])("should be refused for %s", async (role) => {
      signInAs(role);
      const voidOrder = mockVoid();
      voidOrder.mockClear();

      const res = await voidOrderAction(1, { reason: "Entered twice" });
      expect(res).toMatchObject({ error: expect.stringMatching(/Forbidden/) });
      expect(voidOrder).not.toHaveBeenCalled();
    });

    it("should need a reason", async () => {
      signInAs(ADMIN);
      const voidOrder = mockVoid();
      voidOrder.mockClear();

      const res = await voidOrderAction(1, { reason: " " });
      expect(res.success).toBe(false);
      expect(voidOrder).not.toHaveBeenCalled();
    });

    it("should be the only way to cancel, so a reason is always recorded", async () => {
      signInAs(ADMIN);
      const update = mockStatusUpdate();
      update.mockClear();

      const res = await updateOrderStatusAction(1, OrderStatus.CANCELLED);
      expect(res.success).toBe(false);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe("Customers", () => {
    it.each([ADMIN, MANAGER])("should let %s delete", async (role) => {
      signInAs(role);
      vi.spyOn(CustomerService, "delete").mockResolvedValue(true);

      expect((await deleteCustomerAction(1)).success).toBe(true);
    });

    it.each([CASHIER, DELIVERY])("should refuse deletion for %s", async (role) => {
      signInAs(role);
      const res = await deleteCustomerAction(1);
      expect(res).toMatchObject({ error: expect.stringMatching(/Forbidden/) });
    });

    it("should let cashiers edit but not delivery staff", async () => {
      const input = { name: "Name", address: "Address 123", phone: "" };
      vi.spyOn(CustomerService, "update").mockResolvedValue({} as any);

      signInAs(CASHIER);
      expect((await updateCustomerAction(1, input)).success).toBe(true);

      signInAs(DELIVERY);
      expect(await updateCustomerAction(1, input)).toMatchObject({
        error: expect.stringMatching(/Forbidden/),
      });
    });
  });
});
