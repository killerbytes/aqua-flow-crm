"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface CustomerLookupButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
}

export const CustomerLookupButton = ({
  children,
  ...props
}: CustomerLookupButtonProps) => {
  const setCustomerLookupModalOpen = useUIStore(
    (state) => state.setCustomerLookupModalOpen,
  );

  return (
    <Button onClick={() => setCustomerLookupModalOpen(true)} {...props}>
      {children}
    </Button>
  );
};
