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
  /** Void an order at any stage, reversing its payment if it has one. */
  | "CANCEL_ORDER"
  /** Void an order that is still pending and unpaid. */
  | "VOID_PENDING_ORDER"
  | "CREATE_INVOICE"
  | "PAY_INVOICE"
  | "VOID_INVOICE"
  | "REVERSE_PAYMENT"
  | "VIEW_INVOICES"
  | "LOG_EQUIPMENT"
  | "UPDATE_DELIVERY_STATUS"
  | "VIEW_REPORTS"
  | "EXPORT_REPORTS"
  /** Open the Retail page: brand-new items sold over the counter. */
  | "VIEW_RETAIL"
  /** Record a retail sale, including a discount on the bill. */
  | "SELL_RETAIL"
  /** Void a retail sale, which returns its units to stock. */
  | "VOID_RETAIL_SALE";

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
    "VOID_PENDING_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VOID_INVOICE",
    "REVERSE_PAYMENT",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_RETAIL",
    "SELL_RETAIL",
    "VOID_RETAIL_SALE",
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
    "VOID_PENDING_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VOID_INVOICE",
    "REVERSE_PAYMENT",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
    "VIEW_RETAIL",
    "SELL_RETAIL",
    "VOID_RETAIL_SALE",
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
    "VOID_PENDING_ORDER",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "VIEW_INVOICES",
    "LOG_EQUIPMENT",
    "UPDATE_DELIVERY_STATUS",
    "VIEW_REPORTS",
    "VIEW_RETAIL",
    "SELL_RETAIL",
  ],
  [UserRole.DELIVERY]: ["VIEW_ORDERS", "UPDATE_DELIVERY_STATUS"],
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
