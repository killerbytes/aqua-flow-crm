import type {
  Customer,
  Invoice,
  Order,
  ProductInventory,
  RetailProduct,
  User,
} from "@/types/models";
import { create } from "zustand";

interface UIState {
  lookupCustomers: Customer[];
  isCustomerFormModalOpen: boolean;
  editingCustomer?: Customer | null;
  isEquipmentLogModalOpen: boolean;
  isOrderModalOpen: boolean;
  /** Customer the order form opens with, e.g. from the customer page. */
  orderCustomer?: Customer | null;
  isProductModalOpen: boolean;
  editingProduct?: ProductInventory | null;
  isUserModalOpen: boolean;
  editingUser?: User | null;
  isInventoryAdjustmentModalOpen: boolean;
  selectedCustomerId?: number | null;
  selectedProductId?: number | null;
  isCustomerLookupModalOpen: boolean;
  onSelectCustomer?: (id: number) => void;
  isChangePasswordModalOpen: boolean;
  isSpecialPricingModalOpen: boolean;
  isPaymentModalOpen: boolean;
  editingOrder?: Order | null;
  isInvoiceFormModalOpen: boolean;
  isPaymentFormModalOpen: boolean;
  editingInvoice?: Invoice | null;

  isWalkInModalOpen: boolean;
  isRetailSaleModalOpen: boolean;
  isRetailProductModalOpen: boolean;
  /** The retail product being edited, or null to add one. */
  editingRetailProduct?: RetailProduct | null;
  isRetailStockModalOpen: boolean;
  /** The retail product being restocked or written off. */
  stockRetailProduct?: RetailProduct | null;
  setLookupCustomers: (lookupCustomers: Customer[]) => void;
  setCustomerFormModalOpen: (open: boolean, customer?: Customer | null) => void;
  setEquipmentLogModalOpen: (
    open: boolean,
    customerId?: number | null,
    productId?: number | null,
  ) => void;
  /** Pass an order to open the form for editing it instead of creating one. */
  setOrderFormModalOpen: (
    open: boolean,
    customer?: Customer | null,
    order?: Order | null,
  ) => void;
  setWalkInModalOpen: (open: boolean) => void;
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
  setRetailSaleModalOpen: (open: boolean) => void;
  setRetailProductModalOpen: (
    open: boolean,
    product?: RetailProduct | null,
  ) => void;
  setRetailStockModalOpen: (
    open: boolean,
    product?: RetailProduct | null,
  ) => void;
}

export const useUIStore = create<UIState>((set) => ({
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
  isCustomerLookupModalOpen: false,
  isChangePasswordModalOpen: false,
  isSpecialPricingModalOpen: false,
  isPaymentModalOpen: false,
  editingOrder: null,
  isInvoiceFormModalOpen: false,
  isPaymentFormModalOpen: false,
  isWalkInModalOpen: false,
  isRetailSaleModalOpen: false,
  isRetailProductModalOpen: false,
  editingRetailProduct: null,
  isRetailStockModalOpen: false,
  stockRetailProduct: null,

  setLookupCustomers: (lookupCustomers) => set({ lookupCustomers }),
  setCustomerFormModalOpen: (open, customer = null) =>
    set({ isCustomerFormModalOpen: open, editingCustomer: customer }),
  setEquipmentLogModalOpen: (open, customerId, productId) =>
    set({
      isEquipmentLogModalOpen: open,
      selectedCustomerId: customerId,
      selectedProductId: productId,
    }),
  setOrderFormModalOpen: (open, customer = null, order = null) =>
    set({
      isOrderModalOpen: open,
      orderCustomer: customer,
      editingOrder: order,
    }),
  setWalkInModalOpen: (open) => set({ isWalkInModalOpen: open }),
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
  setRetailSaleModalOpen: (open) => set({ isRetailSaleModalOpen: open }),
  setRetailProductModalOpen: (open, product = null) =>
    set({ isRetailProductModalOpen: open, editingRetailProduct: product }),
  setRetailStockModalOpen: (open, product = null) =>
    set({ isRetailStockModalOpen: open, stockRetailProduct: product }),
}));
