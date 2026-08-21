"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  return (
    <Button
      onClick={() =>
        setCustomerLookupModalOpen(true, (id) => {
          router.push(`/customers/${id}`);
        })
      }
      {...props}
      className="w-full justify-start "
    >
      {children}
    </Button>
  );
};
