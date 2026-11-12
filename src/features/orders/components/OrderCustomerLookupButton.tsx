"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { UseFormReturn } from "react-hook-form";

interface OrderCustomerLookupButtonProps {
  children: React.ReactNode;
  form: UseFormReturn<any>;
}

export const OrderCustomerLookupButton = ({
  children,
  form,
  ...props
}: OrderCustomerLookupButtonProps) => {
  const setCustomerLookupModalOpen = useUIStore(
    (state) => state.setCustomerLookupModalOpen,
  );

  return (
    <Button
      variant="outline"
      onClick={() =>
        setCustomerLookupModalOpen(true, (id) => {
          form.setValue("customerId", Number(id));
        })
      }
      {...props}
    >
      {children}
    </Button>
  );
};
