"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import type { RetailProduct } from "@/types/models";

interface RetailProductFormModalButtonProps
  extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  /** The product to edit. Without one, the button adds a product. */
  product?: RetailProduct;
}

export const RetailProductFormModalButton = ({
  children,
  product,
  ...props
}: RetailProductFormModalButtonProps) => {
  const setRetailProductModalOpen = useUIStore(
    (state) => state.setRetailProductModalOpen,
  );

  return (
    <Button onClick={() => setRetailProductModalOpen(true, product)} {...props}>
      {children}
    </Button>
  );
};
