"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { UserPlus } from "lucide-react";
import React from "react";

export const UserListActions: React.FC = () => {
  const { setUserModalOpen } = useUIStore();

  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]}>
      <Button onClick={() => setUserModalOpen(true)} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Add User Account
      </Button>
    </RoleGuard>
  );
};
