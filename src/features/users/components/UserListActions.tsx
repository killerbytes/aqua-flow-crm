"use client";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { UserPlus } from "lucide-react";
import React from "react";

export const UserListActions: React.FC = () => {
  const { setUserModalOpen } = useUIStore();

  return (
    <Button size="sm" onClick={() => setUserModalOpen(true)} className="gap-2">
      <UserPlus className="w-4 h-4" />
      Add User Account
    </Button>
  );
};
