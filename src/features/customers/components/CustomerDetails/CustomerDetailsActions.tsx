"use client";

import { Customer, ProductInventory } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { ArrowRightLeft, Edit } from "lucide-react";

export default function CustomerDetailsActions({
  customer,
  products,
}: {
  customer: Customer;
  products: ProductInventory[];
}) {
  const {
    isCustomerFormModalOpen,
    setEquipmentLogModalOpen,
    setCustomerFormModalOpen,
  } = useUIStore();

  return (
    <div className="flex gap-2">
      <RoleGuard allowedRoles={["Admin", "Cashier"]}>
        <Button
          onClick={() => setCustomerFormModalOpen(true, customer)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Customer
        </Button>
        <Button
          onClick={() => setEquipmentLogModalOpen(true, customer.id)}
          variant="outline"
        >
          <ArrowRightLeft size={16} /> Log Equipment
        </Button>
      </RoleGuard>
      {/* <LogEquipmentModal
        onClose={() => handleToggle({ isLogEquipmentModalOpen: false })}
        customer={customer}
        products={products}
      /> */}
    </div>
  );
}
