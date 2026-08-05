"use client";

import { Customer } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { ArrowRightLeft } from "lucide-react";

export default function TemporaryEquipmentReturn({
  customer,
  productId,
}: {
  customer: Customer;
  productId: number;
}) {
  const { setEquipmentLogModalOpen, setCustomerFormModalOpen } = useUIStore();

  return (
    <div className="flex gap-2">
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
        <Button
          onClick={() =>
            setEquipmentLogModalOpen(true, customer.customerId, productId)
          }
          variant="outline"
          size="icon"
        >
          <ArrowRightLeft size={16} />
        </Button>
      </RoleGuard>
    </div>
  );
}
