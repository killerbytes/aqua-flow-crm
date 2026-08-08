"use client";

import { Customer, ProductInventory } from "@/backend/models";
import { useUIStore } from "@/store/uiStore";
import { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "./ui/button";

export default function ActionButtons({
  id,
  customer,
  children,
  productId,
  variant = "default",
  className,
  product,
}: {
  id: string;
  customer?: Customer;
  children: React.ReactNode;
  productId?: number;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  product?: ProductInventory;
}) {
  const {
    setEquipmentLogModalOpen,
    setCustomerFormModalOpen,
    setCustomerLookupModalOpen,
    setProductFormModalOpen,
    setOrderFormModalOpen,
    setInventoryAdjustmentModalOpen,
    setSpecialPricingModalOpen,
  } = useUIStore();

  switch (id) {
    case "CUSTOMER_FORM_MODAL_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setCustomerFormModalOpen(true, customer)}
          className={className}
        >
          {children}
        </Button>
      );
    case "LOG_EQUIPMENT_BUTTON":
      if (!customer) return null;
      return (
        <Button
          variant={variant}
          onClick={() =>
            setEquipmentLogModalOpen(true, customer.customerId, productId)
          }
          className={className}
        >
          {children}
        </Button>
      );
    case "CUSTOMER_LOOKUP_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setCustomerLookupModalOpen(true)}
          className={className}
        >
          {children}
        </Button>
      );
    case "ORDER_FORM_MODAL_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setOrderFormModalOpen(true)}
          className={className}
        >
          {children}
        </Button>
      );
    case "PRODUCT_FORM_MODAL_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setProductFormModalOpen(true, product)}
          className={className}
        >
          {children}
        </Button>
      );
    case "INVENTORY_ADJUSTMENT_MODAL_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setInventoryAdjustmentModalOpen(true, product)}
          className={className}
        >
          {children}
        </Button>
      );
    case "SPECIAL_PRICING_MODAL_BUTTON":
      return (
        <Button
          variant={variant}
          onClick={() => setSpecialPricingModalOpen(true, customer)}
          className={className}
        >
          {children}
        </Button>
      );
    default:
      return null;
  }
}

export const CustomerFormModalButton = ({
  customer,
  children,
  variant,
  className,
}: {
  customer?: Customer;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) => {
  return (
    <ActionButtons
      id="CUSTOMER_FORM_MODAL_BUTTON"
      customer={customer}
      variant={variant}
      className={className}
    >
      {children}
    </ActionButtons>
  );
};

export const LogEquipmentButton = ({
  customer,
  productId,
  children,
  variant,
  className,
}: {
  customer: Customer;
  productId?: number;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) => {
  return (
    <ActionButtons
      id="LOG_EQUIPMENT_BUTTON"
      customer={customer}
      productId={productId}
      variant={variant}
      className={className}
    >
      {children}
    </ActionButtons>
  );
};

export const CustomerLookupButton = ({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) => {
  return (
    <ActionButtons
      variant={variant}
      className={className}
      id="CUSTOMER_LOOKUP_BUTTON"
    >
      {children}
    </ActionButtons>
  );
};

export const OrderFormModalButton = ({
  children,
  variant,
  className,
}: {
  customer?: Customer;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) => {
  return (
    <ActionButtons
      id="ORDER_FORM_MODAL_BUTTON"
      variant={variant}
      className={className}
    >
      {children}
    </ActionButtons>
  );
};

export const ProductFormModalButton = ({
  children,
  variant,
  className,
  product,
}: {
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  product?: ProductInventory;
}) => {
  return (
    <ActionButtons
      id="PRODUCT_FORM_MODAL_BUTTON"
      variant={variant}
      className={className}
      product={product}
    >
      {children}
    </ActionButtons>
  );
};

export const InventoryAdjustmentModalButton = ({
  children,
  variant,
  className,
  product,
}: {
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  product?: ProductInventory;
}) => {
  return (
    <ActionButtons
      id="INVENTORY_ADJUSTMENT_MODAL_BUTTON"
      variant={variant}
      className={className}
      product={product}
    >
      {children}
    </ActionButtons>
  );
};

export const SpecialPricingModalButton = ({
  children,
  variant,
  className,
  customer,
}: {
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  customer: Customer;
}) => {
  return (
    <ActionButtons
      id="SPECIAL_PRICING_MODAL_BUTTON"
      variant={variant}
      className={className}
      customer={customer}
    >
      {children}
    </ActionButtons>
  );
};
