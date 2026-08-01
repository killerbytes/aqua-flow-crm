import { describe, it, expect } from "vitest";
import { checkPermission, hasRole } from "../src/backend/rbac/permissions";
import { UserRole } from "../src/lib/definitions";

describe("RBAC Security Engine", () => {
  it("should allow ADMIN full access across all operations", () => {
    expect(checkPermission(UserRole.ADMIN, "CREATE_USER")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "ADJUST_INVENTORY")).toBe(true);
    expect(checkPermission(UserRole.ADMIN, "CREATE_ORDER")).toBe(true);
  });

  it("should allow MANAGER to adjust inventory and create orders, but NOT manage users", () => {
    expect(checkPermission(UserRole.MANAGER, "ADJUST_INVENTORY")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "CREATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.MANAGER, "CREATE_USER")).toBe(false);
  });

  it("should allow STAFF to create orders, but NOT adjust inventory or create users", () => {
    expect(checkPermission(UserRole.STAFF, "CREATE_ORDER")).toBe(true);
    expect(checkPermission(UserRole.STAFF, "ADJUST_INVENTORY")).toBe(false);
    expect(checkPermission(UserRole.STAFF, "CREATE_USER")).toBe(false);
  });

  it("should allow DELIVERY to update order delivery status only", () => {
    expect(checkPermission(UserRole.DELIVERY, "UPDATE_DELIVERY_STATUS")).toBe(true);
    expect(checkPermission(UserRole.DELIVERY, "ADJUST_INVENTORY")).toBe(false);
  });

  it("should correctly validate role hierarchy using hasRole", () => {
    expect(hasRole(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
    expect(hasRole(UserRole.STAFF, UserRole.ADMIN)).toBe(false);
  });
});
