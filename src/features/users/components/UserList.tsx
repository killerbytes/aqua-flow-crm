"use client";
import { User } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import DataTable from "@/components/DataTable";
import { ColorBadge } from "@/components/presentation";
import { Button } from "@/components/ui/button";
import { USER_ROLE_BADGE_COLOR, UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Edit, KeyRound } from "lucide-react";
import React from "react";

export default function UserList({ users }: { users: User[] }) {
  const columnHelper = createColumnHelper<User>();
  const { setUserModalOpen, setChangePasswordModalOpen } = useUIStore();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("userId", {
        header: "User ID",
      }),
      columnHelper.accessor("name", {
        header: "Name",
      }),

      columnHelper.accessor("username", {
        header: "Username",
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => (
          <ColorBadge colorMap={USER_ROLE_BADGE_COLOR}>
            {info.getValue()}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("isActive", {
        header: "Active Status",
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: {
          align: "right",
        },
        cell: (info) => {
          const user = info.row.original;
          return (
            <div
              className="flex items-center gap-2 justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <RoleGuard allowedRoles={[UserRole.ADMIN]}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setUserModalOpen(true, user)}
                >
                  <Edit />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setChangePasswordModalOpen(true, user)}
                >
                  <KeyRound />
                </Button>
              </RoleGuard>
            </div>
          );
        },
      }),
    ],
    [],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={users}
          emptyMessage="No users found."
        />
      </motion.div>
    </>
  );
}
