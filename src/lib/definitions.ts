export const PAGINATION = {
  PAGE: 1,
  PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [1, 2, 3, 25, 50, 100],
};

// User Roles & RBAC
export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  DELIVERY = "DELIVERY",
}

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
    value: UserRole.STAFF,
    label: "Staff",
    description: "Standard order creation & customer management",
  },
  {
    value: UserRole.DELIVERY,
    label: "Delivery Personnel",
    description: "Order delivery & container collection",
  },
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Administrator",
  [UserRole.MANAGER]: "Manager",
  [UserRole.STAFF]: "Staff",
  [UserRole.DELIVERY]: "Delivery Personnel",
};

// Equipment Action Types
export enum EquipmentActionType {
  ISSUE = "ISSUE",
  RETURNED = "RETURNED",
  TEMPORARY = "TEMPORARY",
  TEMPORARY_RETURNED = "TEMPORARY_RETURNED",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
}

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
    value: EquipmentActionType.DAMAGED,
    label: "Declared Damaged",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
];

export const EQUIPMENT_ACTION_LABELS: Record<EquipmentActionType, string> = {
  [EquipmentActionType.ISSUE]: "Issued Container",
  [EquipmentActionType.RETURNED]: "Returned Container",
  [EquipmentActionType.TEMPORARY]: "Issued Temporary",
  [EquipmentActionType.TEMPORARY_RETURNED]: "Returned Temporary",
  [EquipmentActionType.LOST]: "Declared Lost",
  [EquipmentActionType.DAMAGED]: "Declared Damaged",
};

// Inventory Adjustment Types
export enum InventoryAdjustmentType {
  STOCK_IN = "STOCK_IN",
  DECLARED_DAMAGED = "DECLARED_DAMAGED",
  DECLARED_LOST = "DECLARED_LOST",
}

export const INVENTORY_ADJUSTMENT_OPTIONS = [
  { value: InventoryAdjustmentType.STOCK_IN, label: "Stock In (Restock)" },
  {
    value: InventoryAdjustmentType.DECLARED_DAMAGED,
    label: "Declared Damaged",
  },
  { value: InventoryAdjustmentType.DECLARED_LOST, label: "Declared Lost" },
];

// Order Status & Payment Status
export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export const ORDER_STATUS_OPTIONS = [
  {
    value: OrderStatus.PENDING,
    label: "Pending",
    color: "text-amber-400 border-amber-500/30",
  },
  {
    value: OrderStatus.PROCESSING,
    label: "Processing",
    color: "text-blue-400 border-blue-500/30",
  },
  {
    value: OrderStatus.OUT_FOR_DELIVERY,
    label: "Out For Delivery",
    color: "text-purple-400 border-purple-500/30",
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

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  PARTIAL = "PARTIAL",
}

export const PAYMENT_STATUS_OPTIONS = [
  { value: PaymentStatus.UNPAID, label: "Unpaid" },
  { value: PaymentStatus.PAID, label: "Paid" },
  { value: PaymentStatus.PARTIAL, label: "Partial Payment" },
];

// Customer Types & Status
export enum CustomerType {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
}

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export const CUSTOMER_TYPE_OPTIONS = [
  { value: CustomerType.RESIDENTIAL, label: "Residential" },
  { value: CustomerType.COMMERCIAL, label: "Commercial / Corporate" },
];

// UI Default Values
export const UI_DEFAULTS = {
  PAGINATION_LIMIT: 10,
  DEFAULT_CUSTOMER_TYPE: CustomerType.RESIDENTIAL,
  DEFAULT_EQUIPMENT_ACTION: EquipmentActionType.ISSUE,
  DEFAULT_ORDER_STATUS: OrderStatus.PENDING,
  DEFAULT_PAYMENT_STATUS: PaymentStatus.UNPAID,
  CURRENCY_SYMBOL: "₱",
  CURRENCY_CODE: "PHP",
};

export const EQUIPMENT_BADGE_COLOR: Record<EquipmentActionType, string> = {
  [EquipmentActionType.ISSUE]: "bg-green-100 text-black border-green-500",
  [EquipmentActionType.RETURNED]: "bg-white text-black border-black",
  [EquipmentActionType.TEMPORARY]: "bg-blue-100 text-black border-blue-500",
  [EquipmentActionType.TEMPORARY_RETURNED]: "bg-white text-black border-black",
  [EquipmentActionType.LOST]: "bg-red-100 text-black border-red-500",
  [EquipmentActionType.DAMAGED]: "bg-orange-100 text-black border-orange-500",
};

export const PAYMENT_STATUS_BADGE_COLOR: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: "bg-orange-100 text-black border-orange-500",
  [PaymentStatus.PAID]: "bg-green-100 text-black border-green-500",
  [PaymentStatus.PARTIAL]: "bg-yellow-100 text-black border-yellow-500",
};

export const ORDER_STATUS_BADGE_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-black border-yellow-500",
  [OrderStatus.PROCESSING]: "bg-blue-100 text-black border-blue-500",
  [OrderStatus.OUT_FOR_DELIVERY]: "bg-purple-100 text-black border-purple-500",
  [OrderStatus.DELIVERED]: "bg-green-100 text-black border-green-500",
  [OrderStatus.CANCELLED]: "bg-red-100 text-black border-red-500",
};
