"use client";

import { ProductInventory } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { CogIcon, Edit } from "lucide-react";
import React from "react";

export const CardListActions: React.FC<{ product: ProductInventory }> = ({
  product,
}) => {
  const { setProductModalOpen, setInventoryAdjustmentModalOpen } = useUIStore();

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => {
          setProductModalOpen(true, product);
        }}
        className="gap-2"
      >
        <Edit />
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setInventoryAdjustmentModalOpen(true, product);
        }}
        className="gap-2"
      >
        <CogIcon />
      </Button>
    </div>
  );
};
