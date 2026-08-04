import { Customer, ProductInventory, User } from "@/backend/models";
import { UserRole } from "@/lib/definitions";
import { create } from "zustand";

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface UIState {
  currentRole: UserRole;
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

  setRole: (role: UserRole) => void;
  setProducts: (products: ProductInventory[]) => void;
  setCustomerFormModalOpen: (open: boolean, customer?: Customer | null) => void;
  setEquipmentLogModalOpen: (
    open: boolean,
    customerId?: number | null,
    productId?: number | null,
  ) => void;
  setOrderModalOpen: (open: boolean) => void;
  setProductModalOpen: (
    open: boolean,
    product?: ProductInventory | null,
  ) => void;
  setUserModalOpen: (open: boolean, user?: User | null) => void;
  setInventoryAdjustmentModalOpen: (
    open: boolean,
    product?: ProductInventory | null,
  ) => void;
  setCustomerLookupModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentRole: UserRole.ADMIN,
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

  setRole: (role) => set({ currentRole: role }),
  setProducts: (products) => set({ products }),
  setCustomerFormModalOpen: (open, customer = null) =>
    set({ isCustomerFormModalOpen: open, editingCustomer: customer }),
  setEquipmentLogModalOpen: (open, customerId, productId) =>
    set({
      isEquipmentLogModalOpen: open,
      selectedCustomerId: customerId,
      selectedProductId: productId,
    }),
  setOrderModalOpen: (open) => set({ isOrderModalOpen: open }),
  setProductModalOpen: (open, product = null) =>
    set({ isProductModalOpen: open, editingProduct: product }),
  setUserModalOpen: (open, user = null) =>
    set({ isUserModalOpen: open, editingUser: user }),
  setInventoryAdjustmentModalOpen: (open, product = null) =>
    set({ isInventoryAdjustmentModalOpen: open, editingProduct: product }),
  setCustomerLookupModalOpen: (open) =>
    set({ isCustomerLookupModalOpen: open }),
}));
