"use client";

import { ProductInventory } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface ProductFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  product?: ProductInventory;
}

export const ProductFormModalButton = ({
  children,
  product,
  ...props
}: ProductFormModalButtonProps) => {
  const setProductFormModalOpen = useUIStore(
    (state) => state.setProductFormModalOpen,
  );

  return (
    <Button onClick={() => setProductFormModalOpen(true, product)} {...props}>
      {children}
    </Button>
  );
};
