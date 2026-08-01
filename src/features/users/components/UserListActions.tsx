"use client";

import React from "react";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export const UserListActions: React.FC = () => {
  const { setUserModalOpen } = useUIStore();

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => setUserModalOpen(true)}
      className="gap-2"
    >
      <UserPlus className="w-4 h-4" />
      Add User Account
    </Button>
  );
};
