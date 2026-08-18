"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface OrderFormModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
}

export const OrderFormModalButton = ({
  children,
  ...props
}: OrderFormModalButtonProps) => {
  const setOrderFormModalOpen = useUIStore(
    (state) => state.setOrderFormModalOpen,
  );

  return (
    <Button onClick={() => setOrderFormModalOpen(true)} {...props}>
      {children}
    </Button>
  );
};
