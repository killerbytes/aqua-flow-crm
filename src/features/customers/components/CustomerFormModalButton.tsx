"use client";

import { Customer } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface CustomerFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  customer?: Customer;
}

export const CustomerFormModalButton = ({
  children,
  customer,
  ...props
}: CustomerFormModalButtonProps) => {
  const setCustomerFormModalOpen = useUIStore(
    (state) => state.setCustomerFormModalOpen,
  );

  return (
    <Button onClick={() => setCustomerFormModalOpen(true, customer)} {...props}>
      {children}
    </Button>
  );
};
