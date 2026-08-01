"use client";

import { Customer } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { Pencil } from "lucide-react";
import React from "react";

export const EditCustomerButton: React.FC<{ customer: Customer }> = ({
  customer,
}) => {
  const { setCustomerFormModalOpen } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCustomerFormModalOpen(true, customer)}
      className="h-8 px-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
      title="Edit Customer Profile"
    >
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  );
};
