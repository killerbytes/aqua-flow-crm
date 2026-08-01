"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { Plus } from "lucide-react";
import React from "react";

export const OrderListActions: React.FC = () => {
  const { setOrderModalOpen } = useUIStore();

  return (
    <Button onClick={() => setOrderModalOpen(true)} className="gap-2">
      <Plus />
      Create Order
    </Button>
  );
};
