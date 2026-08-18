"use client";

import { Customer } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface SpecialPricingModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  customer?: Customer;
}

export const SpecialPricingModalButton = ({
  children,
  customer,
  ...props
}: SpecialPricingModalButtonProps) => {
  const setSpecialPricingModalOpen = useUIStore(
    (state) => state.setSpecialPricingModalOpen,
  );

  return (
    <Button
      onClick={() => setSpecialPricingModalOpen(true, customer)}
      {...props}
    >
      {children}
    </Button>
  );
};
