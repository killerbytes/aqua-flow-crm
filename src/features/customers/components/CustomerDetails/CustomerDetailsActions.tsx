"use client";

import { Customer } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { ArrowRightLeft, Edit } from "lucide-react";

export default function CustomerDetailsActions({
  customer,
}: {
  customer: Customer;
}) {
  const { setEquipmentLogModalOpen, setCustomerFormModalOpen } = useUIStore();

  return (
    <div className="flex gap-2">
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
        <Button
          variant="outline"
          onClick={() => setCustomerFormModalOpen(true, customer)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Customer
        </Button>
        <Button
          onClick={() => setEquipmentLogModalOpen(true, customer.customerId)}
          variant="outline"
        >
          <ArrowRightLeft size={16} /> Log Equipment
        </Button>
      </RoleGuard>
    </div>
  );
}
