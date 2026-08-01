"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { PackageCheck, UserPlus } from "lucide-react";
import React from "react";

export const CustomerActions: React.FC = () => {
  const { setCustomerFormModalOpen, setEquipmentLogModalOpen } = useUIStore();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEquipmentLogModalOpen(true)}
        className="gap-2"
      >
        <PackageCheck className="w-4 h-4" />
        Log Equipment
      </Button>
      <Button
        size="sm"
        onClick={() => setCustomerFormModalOpen(true)}
        className="gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Add Customer
      </Button>
    </div>
  );
};
