"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { UserPlus } from "lucide-react";
import React from "react";

export const CustomerListActions: React.FC = () => {
  const { setCustomerFormModalOpen } = useUIStore();

  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => setCustomerFormModalOpen(true)} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Add Customer
      </Button>
    </div>
  );
};
