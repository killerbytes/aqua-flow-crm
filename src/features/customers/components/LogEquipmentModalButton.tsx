"use client";

import { Customer } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface LogEquipmentModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
  customer?: Customer;
  customerId?: number;
  productId?: number;
}

export const LogEquipmentModalButton = ({
  children,
  customer,
  customerId,
  productId,
  ...props
}: LogEquipmentModalButtonProps) => {
  const setEquipmentLogModalOpen = useUIStore(
    (state) => state.setEquipmentLogModalOpen,
  );

  const targetCustomerId = customerId ?? customer?.customerId;

  return (
    <Button
      onClick={() => setEquipmentLogModalOpen(true, targetCustomerId, productId)}
      {...props}
    >
      {children}
    </Button>
  );
};
