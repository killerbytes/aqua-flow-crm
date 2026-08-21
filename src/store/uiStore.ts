import {
  Customer,
  Invoice,
  Order,
  ProductInventory,
  User,
} from "@/backend/models";
import { UserRole } from "@/lib/definitions";
import { create } from "zustand";

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface UIState {
  currentRole: UserRole;
  lookupCustomers: Customer[];
  isCustomerFormModalOpen: boolean;
  editingCustomer?: Customer | null;
  isEquipmentLogModalOpen: boolean;
  isOrderModalOpen: boolean;
  isProductModalOpen: boolean;
  editingProduct?: ProductInventory | null;
  isUserModalOpen: boolean;
  editingUser?: User | null;
  isInventoryAdjustmentModalOpen: boolean;
  selectedCustomerId?: number | null;
  selectedProductId?: number | null;
  products: ProductInventory[];
  isCustomerLookupModalOpen: boolean;
  onSelectCustomer?: (id: number) => void;
  isChangePasswordModalOpen: boolean;
  isSpecialPricingModalOpen: boolean;
  isPaymentModalOpen: boolean;
  editingOrder?: Order | null;
  isInvoiceFormModalOpen: boolean;
  isPaymentFormModalOpen: boolean;
  editingInvoice?: Invoice | null;

  setRole: (role: UserRole) => void;
  setProducts: (products: ProductInventory[]) => void;
  setLookupCustomers: (lookupCustomers: Customer[]) => void;
  setCustomerFormModalOpen: (open: boolean, customer?: Customer | null) => void;
  setEquipmentLogModalOpen: (
    open: boolean,
    customerId?: number | null,
    productId?: number | null,
  ) => void;
  setOrderFormModalOpen: (open: boolean) => void;
  setProductFormModalOpen: (
    open: boolean,
    product?: ProductInventory | null,
  ) => void;
  setUserModalOpen: (open: boolean, user?: User | null) => void;
  setInventoryAdjustmentModalOpen: (
    open: boolean,
    product?: ProductInventory | null,
  ) => void;
  setCustomerLookupModalOpen: (
    open: boolean,
    onSelect?: (id: number) => void,
  ) => void;
  setChangePasswordModalOpen: (open: boolean, user: User | null) => void;
  setSpecialPricingModalOpen: (
    open: boolean,
    customer?: Customer | null,
  ) => void;

  setPaymentModalOpen: (open: boolean, order: Order | null) => void;
  setInvoiceFormModalOpen: (open: boolean, customer?: Customer | null) => void;
  setPaymentFormModalOpen: (open: boolean, invoice?: Invoice | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentRole: UserRole.ADMIN,
  lookupCustomers: [],
  isCustomerFormModalOpen: false,
  editingCustomer: null,
  isEquipmentLogModalOpen: false,
  isOrderModalOpen: false,
  isProductModalOpen: false,
  editingProduct: null,
  isUserModalOpen: false,
  editingUser: null,
  isInventoryAdjustmentModalOpen: false,
  selectedCustomerId: null,
  selectedProductId: null,
  products: [],
  isCustomerLookupModalOpen: false,
  isChangePasswordModalOpen: false,
  isSpecialPricingModalOpen: false,
  isPaymentModalOpen: false,
  editingOrder: null,
  isInvoiceFormModalOpen: false,
  isPaymentFormModalOpen: false,

  setRole: (role) => set({ currentRole: role }),
  setProducts: (products) => set({ products }),
  setLookupCustomers: (lookupCustomers) => set({ lookupCustomers }),
  setCustomerFormModalOpen: (open, customer = null) =>
    set({ isCustomerFormModalOpen: open, editingCustomer: customer }),
  setEquipmentLogModalOpen: (open, customerId, productId) =>
    set({
      isEquipmentLogModalOpen: open,
      selectedCustomerId: customerId,
      selectedProductId: productId,
    }),
  setOrderFormModalOpen: (open) => set({ isOrderModalOpen: open }),
  setProductFormModalOpen: (open, product = null) =>
    set({ isProductModalOpen: open, editingProduct: product }),
  setUserModalOpen: (open, user = null) =>
    set({ isUserModalOpen: open, editingUser: user }),
  setInventoryAdjustmentModalOpen: (open, product = null) =>
    set({ isInventoryAdjustmentModalOpen: open, editingProduct: product }),
  setCustomerLookupModalOpen: (open, onSelect) =>
    set({ isCustomerLookupModalOpen: open, onSelectCustomer: onSelect }),
  setChangePasswordModalOpen: (open, user = null) =>
    set({ isChangePasswordModalOpen: open, editingUser: user }),
  setSpecialPricingModalOpen: (open, customer = null) =>
    set({
      isSpecialPricingModalOpen: open,
      editingCustomer: customer,
    }),
  setPaymentModalOpen: (open, order = null) =>
    set({ isPaymentModalOpen: open, editingOrder: order }),
  setInvoiceFormModalOpen: (open, customer = null) =>
    set({ isInvoiceFormModalOpen: open, editingCustomer: customer }),
  setPaymentFormModalOpen: (open, invoice = null) =>
    set({ isPaymentFormModalOpen: open, editingInvoice: invoice }),
}));
