import { UserRole } from "@/lib/definitions";

export type PermissionAction =
  | "CREATE_USER"
  | "MANAGE_USERS"
  | "CREATE_CUSTOMER"
  | "MANAGE_CUSTOMERS"
  | "CREATE_PRODUCT"
  | "MANAGE_PRODUCTS"
  | "ADJUST_INVENTORY"
  | "CREATE_ORDER"
  | "UPDATE_ORDER"
  | "DELETE_ORDER"
  | "LOG_EQUIPMENT"
  | "UPDATE_DELIVERY_STATUS"
  | "VIEW_REPORTS";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  [UserRole.ADMIN]: [
    "CREATE_USER",
    "MANAGE_USERS",
    "CREATE_CUSTOMER",
    "MANAGE_CUSTOMERS",
    "CREATE_PRODUCT",
    "MANAGE_PRODUCTS",
    "ADJUST_INVENTORY",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "DELETE_ORDER",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
  ],
  [UserRole.MANAGER]: [
    "CREATE_CUSTOMER",
    "MANAGE_CUSTOMERS",
    "CREATE_PRODUCT",
    "MANAGE_PRODUCTS",
    "ADJUST_INVENTORY",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
  ],
  [UserRole.CASHIER]: [
    "CREATE_CUSTOMER",
    "MANAGE_CUSTOMERS",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
  ],
  [UserRole.DELIVERY]: ["UPDATE_DELIVERY_STATUS"],
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.CASHIER]: 2,
  [UserRole.DELIVERY]: 1,
};

/**
 * Check if a role has permission for a specific action
 */
export function checkPermission(
  role: UserRole,
  action: PermissionAction,
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Compare role hierarchy levels
 */
export function hasRole(
  currentRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return (
    (ROLE_HIERARCHY[currentRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
  );
}
