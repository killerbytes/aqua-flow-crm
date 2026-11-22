/** How many Philippine days back staff can date an order. Later dates are refused. */
export const MAX_ORDER_BACKDATE_DAYS = 30;

export const PAGINATION = {
  PAGE: 1,
  PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [25, 50, 100],
};

// User Roles & RBAC
export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  DELIVERY: "DELIVERY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_OPTIONS = [
  {
    value: UserRole.ADMIN,
    label: "Administrator",
    description: "Full system access & user management",
  },
  {
    value: UserRole.MANAGER,
    label: "Manager",
    description: "Inventory adjustments & customer overrides",
  },
  {
    value: UserRole.CASHIER,
    label: "Cashier",
    description: "Standard order creation & customer management",
  },
  {
    value: UserRole.DELIVERY,
    label: "Delivery Personnel",
    description: "Order delivery & container collection",
  },
];

// Ledger Account & Reference Types (Pattern 1 Double-Entry Equipment Ledger)
export const LedgerAccountType = {
  STATION: "STATION",
  CUSTOMER: "CUSTOMER",
  CUSTOMER_TEMP: "CUSTOMER_TEMP",
  SUPPLIER: "SUPPLIER",
  SCRAP_DAMAGED: "SCRAP_DAMAGED",
  SCRAP_LOST: "SCRAP_LOST",
  IN_TRANSIT: "IN_TRANSIT",
} as const;
export type LedgerAccountType =
  (typeof LedgerAccountType)[keyof typeof LedgerAccountType];

export const LedgerReferenceType = {
  ORDER: "ORDER",
  MANUAL_LOG: "MANUAL_LOG",
  INVENTORY_ADJUSTMENT: "INVENTORY_ADJUSTMENT",
  RESTOCK: "RESTOCK",
} as const;
export type LedgerReferenceType =
  (typeof LedgerReferenceType)[keyof typeof LedgerReferenceType];

export const LEDGER_ACCOUNT_LABELS: Record<LedgerAccountType, string> = {
  [LedgerAccountType.STATION]: "Station Warehouse",
  [LedgerAccountType.CUSTOMER]: "Customer Owed",
  [LedgerAccountType.CUSTOMER_TEMP]: "Customer Temporary",
  [LedgerAccountType.SUPPLIER]: "External Supplier",
  [LedgerAccountType.SCRAP_DAMAGED]: "Scrap (Damaged)",
  [LedgerAccountType.SCRAP_LOST]: "Scrap (Lost)",
  [LedgerAccountType.IN_TRANSIT]: "In Transit",
};

// Equipment Action Types

export const ActionType = {
  ISSUE: "ISSUE",
  RETURNED: "RETURNED",
  LOST: "LOST",
  DAMAGED: "DAMAGED",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const TemporaryEquipmentActionType = {
  TEMPORARY: "TEMPORARY",
  TEMPORARY_RETURNED: "TEMPORARY_RETURNED",
  TEMPORARY_LOST: "TEMPORARY_LOST",
  TEMPORARY_DAMAGED: "TEMPORARY_DAMAGED",
} as const;
export type TemporaryEquipmentActionType =
  (typeof TemporaryEquipmentActionType)[keyof typeof TemporaryEquipmentActionType];

export const EquipmentActionType = {
  ...ActionType,
  ...TemporaryEquipmentActionType,
} as const;

export type EquipmentActionType =
  (typeof EquipmentActionType)[keyof typeof EquipmentActionType];

export const EQUIPMENT_ACTION_OPTIONS = [
  {
    value: EquipmentActionType.ISSUE,
    label: "Issue Container (Owed)",
    badgeColor: "bg-blue-500/20 text-blue-300",
  },
  {
    value: EquipmentActionType.RETURNED,
    label: "Return Container",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
  },
  {
    value: EquipmentActionType.TEMPORARY,
    label: "Issue Temporary Container",
    badgeColor: "bg-amber-500/20 text-amber-300",
  },
  {
    value: EquipmentActionType.TEMPORARY_RETURNED,
    label: "Return Temporary Container",
    badgeColor: "bg-teal-500/20 text-teal-300",
  },
  {
    value: EquipmentActionType.LOST,
    label: "Declared Lost",
    badgeColor: "bg-rose-500/20 text-rose-300",
  },
  {
    value: EquipmentActionType.TEMPORARY_LOST,
    label: "Declared Lost (Temporary)",
    badgeColor: "bg-rose-600/20 text-rose-400",
  },
  {
    value: EquipmentActionType.DAMAGED,
    label: "Declared Damaged",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
  {
    value: EquipmentActionType.TEMPORARY_DAMAGED,
    label: "Declared Damaged (Temporary)",
    badgeColor: "bg-purple-600/20 text-purple-400",
  },
];

// Inventory Adjustment Types
export const InventoryAdjustmentType = {
  STOCK_IN: "STOCK_IN",
  DECLARED_DAMAGED: "DECLARED_DAMAGED",
  DECLARED_LOST: "DECLARED_LOST",
} as const;
export type InventoryAdjustmentType =
  (typeof InventoryAdjustmentType)[keyof typeof InventoryAdjustmentType];

export const INVENTORY_ADJUSTMENT_OPTIONS = [
  { value: InventoryAdjustmentType.STOCK_IN, label: "Stock In (Restock)" },
  {
    value: InventoryAdjustmentType.DECLARED_DAMAGED,
    label: "Declared Damaged",
  },
  { value: InventoryAdjustmentType.DECLARED_LOST, label: "Declared Lost" },
];

// Retail Stock (brand-new items sold over the counter)
/**
 * Why a retail product's stock changed. Restocks and returns from voided
 * sales add to it; sales and write-offs take from it.
 */
export const RetailStockEntryType = {
  RESTOCK: "RESTOCK",
  SALE: "SALE",
  SALE_VOID: "SALE_VOID",
  WRITE_OFF: "WRITE_OFF",
} as const;
export type RetailStockEntryType =
  (typeof RetailStockEntryType)[keyof typeof RetailStockEntryType];

export const RETAIL_STOCK_ENTRY_LABELS: Record<RetailStockEntryType, string> = {
  [RetailStockEntryType.RESTOCK]: "Restock",
  [RetailStockEntryType.SALE]: "Sold",
  [RetailStockEntryType.SALE_VOID]: "Returned (sale voided)",
  [RetailStockEntryType.WRITE_OFF]: "Written off",
};

/** The stock changes staff make by hand. Sales and voids make the others. */
export const RETAIL_STOCK_ADJUSTMENT_OPTIONS = [
  { value: RetailStockEntryType.RESTOCK, label: "Restock (add stock)" },
  {
    value: RetailStockEntryType.WRITE_OFF,
    label: "Write off (damaged or lost)",
  },
] as const;

// Order Status & Payment Status
export const OrderStatus = {
  PENDING: "PENDING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_OPTIONS = [
  {
    value: OrderStatus.PENDING,
    label: "Pending",
    color: "text-amber-400 border-amber-500/30",
  },
  {
    value: OrderStatus.OUT_FOR_DELIVERY,
    label: "Out For Delivery",
    color: "text-yellow-400 border-yellow-500/30",
  },
  {
    value: OrderStatus.DELIVERED,
    label: "Delivered",
    color: "text-emerald-400 border-emerald-500/30",
  },
  {
    value: OrderStatus.CANCELLED,
    label: "Cancelled",
    color: "text-rose-400 border-rose-500/30",
  },
];

export const PaymentStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CASH: "CASH",
  GCASH: "GCASH",
  ONLINE: "ONLINE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.GCASH]: "GCash",
  [PaymentMethod.ONLINE]: "Online",
};

export const CustomerStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type CustomerStatus =
  (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const InvoiceStatus = {
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  UNPAID: "UNPAID",
  VOID: "VOID",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const INVOICE_STATUS_BADGE_COLOR: Record<InvoiceStatus, string> = {
  [InvoiceStatus.UNPAID]: "bg-red-100 text-black border-red-500",
  [InvoiceStatus.PARTIAL]: "bg-yellow-100 text-black border-yellow-500",
  [InvoiceStatus.PAID]: "bg-green-100 text-black border-green-500",
  [InvoiceStatus.VOID]: "bg-black text-white border-black",
};

export const EQUIPMENT_BADGE_COLOR: Record<EquipmentActionType, string> = {
  [EquipmentActionType.ISSUE]: "bg-green-100 text-black border-green-500",
  [EquipmentActionType.RETURNED]: "bg-white text-black border-black",
  [EquipmentActionType.TEMPORARY]: "bg-yellow-100 text-black border-yellow-500",
  [EquipmentActionType.TEMPORARY_RETURNED]:
    "bg-yellow-500 text-white border-yellow-100",
  [EquipmentActionType.LOST]: "bg-red-100 text-black border-red-500",
  [EquipmentActionType.TEMPORARY_LOST]: "bg-red-200 text-black border-red-600",
  [EquipmentActionType.DAMAGED]: "bg-orange-100 text-black border-orange-500",
  [EquipmentActionType.TEMPORARY_DAMAGED]:
    "bg-orange-200 text-black border-orange-600",
};

export const PAYMENT_STATUS_BADGE_COLOR: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: "bg-gray-100 text-black border-gray-500",
  [PaymentStatus.PAID]: "bg-green-100 text-black border-green-500",
};

export const PAYMENT_METHOD_BADGE_COLOR: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "bg-green-500 text-white border-green-100",
  [PaymentMethod.GCASH]: "bg-blue-100 text-black border-blue-500",
  [PaymentMethod.ONLINE]: "bg-purple-100 text-black border-purple-500",
};

export const ORDER_STATUS_BADGE_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-black border-yellow-500",
  [OrderStatus.OUT_FOR_DELIVERY]: "bg-orange-100 text-black border-orange-500",
  [OrderStatus.DELIVERED]: "bg-green-100 text-black border-green-500",
  [OrderStatus.CANCELLED]: "bg-red-100 text-black border-red-500",
};

export const USER_ROLE_BADGE_COLOR: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-black border-red-500",
  [UserRole.MANAGER]: "bg-blue-100 text-black border-blue-500",
  [UserRole.CASHIER]: "bg-yellow-100 text-black border-yellow-500",
  [UserRole.DELIVERY]: "bg-green-100 text-black border-green-500",
};

export const CUSTOMER_STATUS_BADGE_COLOR: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: "bg-green-100 text-black border-green-500",
  [CustomerStatus.INACTIVE]: "bg-red-100 text-black border-red-500",
};
