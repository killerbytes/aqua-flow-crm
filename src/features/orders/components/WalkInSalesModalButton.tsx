"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

interface WalkInSalesModalButtonProps extends React.ComponentProps<
  typeof Button
> {
  children: React.ReactNode;
}

export const WalkInSalesModalButton = ({
  children,
  ...props
}: WalkInSalesModalButtonProps) => {
  const setWalkInModalOpen = useUIStore(
    (state) => state.setWalkInModalOpen,
  );

  return (
    <Button onClick={() => setWalkInModalOpen(true)} {...props}>
      {children}
    </Button>
  );
};
