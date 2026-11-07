import { UserRole } from "@/lib/definitions";

export type PermissionAction =
  | "VIEW_DASHBOARD"
  | "VIEW_USERS"
  | "CREATE_USER"
  | "MANAGE_USERS"
  | "VIEW_CUSTOMERS"
  | "CREATE_CUSTOMER"
  | "MANAGE_CUSTOMERS"
  | "DELETE_CUSTOMER"
  | "CREATE_PRODUCT"
  | "MANAGE_PRODUCTS"
  | "VIEW_PRODUCTS"
  | "ADJUST_INVENTORY"
  | "VIEW_ORDERS"
  | "CREATE_ORDER"
  | "UPDATE_ORDER"
  | "CANCEL_ORDER"
  | "DELETE_ORDER"
  | "CREATE_INVOICE"
  | "PAY_INVOICE"
  | "VOID_INVOICE"
  | "VIEW_INVOICES"
  | "LOG_EQUIPMENT"
  | "UPDATE_DELIVERY_STATUS"
  | "VIEW_REPORTS";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  [UserRole.ADMIN]: [
    "VIEW_DASHBOARD",
    "VIEW_USERS",
    "CREATE_USER",
    "MANAGE_USERS",
    "VIEW_CUSTOMERS",
    "CREATE_CUSTOMER",
    "MANAGE_CUSTOMERS",
    "DELETE_CUSTOMER",
    "CREATE_PRODUCT",
    "MANAGE_PRODUCTS",
    "VIEW_PRODUCTS",
    "ADJUST_INVENTORY",
    "VIEW_ORDERS",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "CANCEL_ORDER",
    "DELETE_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VOID_INVOICE",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
  ],
  [UserRole.MANAGER]: [
    "VIEW_DASHBOARD",
    "VIEW_USERS",
    "VIEW_CUSTOMERS",
    "CREATE_CUSTOMER",
    "MANAGE_CUSTOMERS",
    "DELETE_CUSTOMER",
    "CREATE_PRODUCT",
    "MANAGE_PRODUCTS",
    "VIEW_PRODUCTS",
    "ADJUST_INVENTORY",
    "VIEW_ORDERS",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "CANCEL_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VOID_INVOICE",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
  ],
  [UserRole.CASHIER]: [
    "VIEW_DASHBOARD",
    "VIEW_CUSTOMERS",
    "CREATE_CUSTOMER",
    "VIEW_PRODUCTS",
    "VIEW_ORDERS",
    "MANAGE_CUSTOMERS",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
  ],
  [UserRole.DELIVERY]: ["VIEW_ORDERS", "UPDATE_DELIVERY_STATUS"],
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
 * Where to send a user who can't open a page, or null if they can. The target
 * never loops: everyone who can't see the dashboard goes to orders, and anyone
 * who can't see orders either goes to login.
 */
export function getPageRedirect(
  role: UserRole,
  permission: PermissionAction,
): string | null {
  if (checkPermission(role, permission)) return null;
  if (checkPermission(role, "VIEW_DASHBOARD")) return "/";
  if (checkPermission(role, "VIEW_ORDERS")) return "/orders";
  return "/login";
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
