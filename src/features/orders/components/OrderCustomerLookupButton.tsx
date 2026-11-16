"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface OrderCustomerLookupButtonProps {
  children: React.ReactNode;
  /** Any form with a customerId field. */
  form: { setValue: (name: "customerId", value: number) => void };
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
