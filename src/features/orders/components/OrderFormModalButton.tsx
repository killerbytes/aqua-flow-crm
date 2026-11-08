"use client";

import type { Customer } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface OrderFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  /** Opens the form with this customer already selected. */
  customer?: Customer;
}

export const OrderFormModalButton = ({
  children,
  customer,
  ...props
}: OrderFormModalButtonProps) => {
  const setOrderFormModalOpen = useUIStore(
    (state) => state.setOrderFormModalOpen,
  );

  return (
    <Button onClick={() => setOrderFormModalOpen(true, customer)} {...props}>
      {children}
    </Button>
  );
};
