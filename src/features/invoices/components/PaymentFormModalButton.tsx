"use client";

import { Invoice } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface PaymentFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  invoice?: Invoice;
}

export const PaymentFormModalButton = ({
  children,
  invoice,
  ...props
}: PaymentFormModalButtonProps) => {
  const setPaymentFormModalOpen = useUIStore(
    (state) => state.setPaymentFormModalOpen,
  );

  return (
    <Button onClick={() => setPaymentFormModalOpen(true, invoice)} {...props}>
      {children}
    </Button>
  );
};
