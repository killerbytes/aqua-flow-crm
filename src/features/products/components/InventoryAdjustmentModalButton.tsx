"use client";

import { ProductInventory } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface InventoryAdjustmentModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  product?: ProductInventory;
}

export const InventoryAdjustmentModalButton = ({
  children,
  product,
  ...props
}: InventoryAdjustmentModalButtonProps) => {
  const setInventoryAdjustmentModalOpen = useUIStore(
    (state) => state.setInventoryAdjustmentModalOpen,
  );

  return (
    <Button
      onClick={() => setInventoryAdjustmentModalOpen(true, product)}
      {...props}
    >
      {children}
    </Button>
  );
};
