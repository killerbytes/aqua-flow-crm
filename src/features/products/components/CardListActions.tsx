"use client";

import { ProductInventory } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { Edit } from "lucide-react";
import React from "react";

export const CardListActions: React.FC<{ product: ProductInventory }> = ({
  product,
}) => {
  const { setProductModalOpen } = useUIStore();

  return (
    <Button
      onClick={() => {
        setProductModalOpen(true, product);
      }}
      className="gap-2"
    >
      <Edit />
    </Button>
  );
};
