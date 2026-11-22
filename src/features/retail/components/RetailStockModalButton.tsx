"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import type { RetailProduct } from "@/types/models";

interface RetailStockModalButtonProps
  extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  product: RetailProduct;
}

export const RetailStockModalButton = ({
  children,
  product,
  ...props
}: RetailStockModalButtonProps) => {
  const setRetailStockModalOpen = useUIStore(
    (state) => state.setRetailStockModalOpen,
  );

  return (
    <Button onClick={() => setRetailStockModalOpen(true, product)} {...props}>
      {children}
    </Button>
  );
};
