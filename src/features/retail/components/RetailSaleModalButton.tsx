"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface RetailSaleModalButtonProps
  extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
}

export const RetailSaleModalButton = ({
  children,
  ...props
}: RetailSaleModalButtonProps) => {
  const setRetailSaleModalOpen = useUIStore(
    (state) => state.setRetailSaleModalOpen,
  );

  return (
    <Button onClick={() => setRetailSaleModalOpen(true)} {...props}>
      {children}
    </Button>
  );
};
