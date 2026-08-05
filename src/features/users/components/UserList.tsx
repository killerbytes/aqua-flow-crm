"use client";
import { User } from "@/backend/models";
import { ColorBadge } from "@/components/ui/presentation";
import DataTable from "@/components/DataTable";
import { USER_ROLE_BADGE_COLOR } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import React from "react";

export default function UserList({ users }: { users: User[] }) {
  const columnHelper = createColumnHelper<User>();
  const { setUserModalOpen } = useUIStore();
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
          onRowClick={(user) => setUserModalOpen(true, user)}
        />
      </motion.div>
    </>
  );
}
