"use client";

import React from "react";
import { useUIStore, CustomerData } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export const EditCustomerButton: React.FC<{ customer: CustomerData }> = ({ customer }) => {
  const { setCustomerModalOpen } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCustomerModalOpen(true, customer)}
      className="h-8 px-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
      title="Edit Customer Profile"
    >
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  );
};
