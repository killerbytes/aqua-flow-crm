"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { Plus } from "lucide-react";
import React from "react";

export const ProductListActions: React.FC = () => {
  const { setProductModalOpen } = useUIStore();

  return (
    <Button onClick={() => setProductModalOpen(true)} className="gap-2">
      <Plus className="w-4 h-4" />
      Add Product
    </Button>
  );
};
