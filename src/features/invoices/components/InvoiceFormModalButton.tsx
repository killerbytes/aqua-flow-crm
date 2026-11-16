"use client";

import type { Customer } from "@/types/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface InvoiceFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  customer?: Customer;
}

export const InvoiceFormModalButton = ({
  children,
  customer,
  ...props
}: InvoiceFormModalButtonProps) => {
  const setInvoiceFormModalOpen = useUIStore(
    (state) => state.setInvoiceFormModalOpen,
  );

  return (
    <Button onClick={() => setInvoiceFormModalOpen(true, customer)} {...props}>
      {children}
    </Button>
  );
};
