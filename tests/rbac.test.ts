import { describe, expect, it } from "vitest";
import { checkPermission, hasRole } from "../src/backend/rbac/permissions";
import { UserRole } from "../src/lib/definitions";

describe("RBAC Security Engine", () => {
  it("should allow ADMIN full access across all operations", () => {
    expect(checkPermission(UserRole.ADMIN, "CREATE_USER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "MANAGE_USERS")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "CREATE_CUSTOMER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "MANAGE_CUSTOMERS")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "CREATE_PRODUCT")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "MANAGE_PRODUCTS")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "ADJUST_INVENTORY")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "CREATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "UPDATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "DELETE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "LOG_EQUIPMENT")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "UPDATE_DELIVERY_STATUS")).toBe(
      true,
    );
    expect(checkPermission(UserRole.ADMIN, "VIEW_REPORTS")).toBe(true);
  });

  it("should allow MANAGER to adjust inventory and create orders, but NOT manage users", () => {
    expect(checkPermission(UserRole.MANAGER, "CREATE_CUSTOMER")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "MANAGE_CUSTOMERS")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "CREATE_PRODUCT")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "MANAGE_PRODUCTS")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "ADJUST_INVENTORY")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "CREATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "UPDATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "LOG_EQUIPMENT")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "UPDATE_DELIVERY_STATUS")).toBe(
      true,
    );
  });

  it("should allow CASHIER to create orders, but NOT adjust inventory or create users", () => {
    expect(checkPermission(UserRole.CASHIER, "CREATE_CUSTOMER")).toBe(true);
    expect(checkPermission(UserRole.CASHIER, "MANAGE_CUSTOMERS")).toBe(true);
    expect(checkPermission(UserRole.CASHIER, "CREATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.CASHIER, "UPDATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.CASHIER, "LOG_EQUIPMENT")).toBe(true);
    expect(checkPermission(UserRole.CASHIER, "UPDATE_DELIVERY_STATUS")).toBe(
      true,
    );
  });

  it("should correctly validate role hierarchy using hasRole", () => {
    expect(hasRole(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
    expect(hasRole(UserRole.CASHIER, UserRole.ADMIN)).toBe(false);
  });
});
