"use client";
import { Customer } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import DataTable from "@/components/DataTable";
import MonoText from "@/components/MonoText";
import { Button } from "@/components/ui/button";
import { CustomerStatus, UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import { motion } from "framer-motion";
import { Edit, Tag } from "lucide-react";
import Link from "next/link";
import React from "react";

interface CustomerListProps {
  customers: Paginated<Customer>;
}

export default function CustomerList({ customers }: CustomerListProps) {
  const { isCustomerFormModalOpen, setCustomerFormModalOpen } = useUIStore();

  const columnHelper = createColumnHelper<Customer>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("customerId", {
        header: "ID",
        cell: (info) => (
          <MonoText className="font-semibold">#{info.getValue()}</MonoText>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => {
          const customer = info.row.original;
          const hasSpecialPricing = (customer.specialPricings?.length ?? 0) > 0;

          return (
            <div
              className={cx(
                "flex items-center gap-2",
                customer.status === CustomerStatus.INACTIVE
                  ? "opacity-60"
                  : "opacity-100 text-primary",
              )}
            >
              <Link
                onClick={(e) => e.stopPropagation()}
                href={`/customers/${customer.customerId}`}
                className="font-medium hover:underline text-primary"
              >
                {info.getValue()}
              </Link>
              {hasSpecialPricing && <Tag className="w-4 h-4 text-orange-500" />}
            </div>
          );
        },
      }),

      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <MonoText>{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("barangay", {
        header: "Barangay",
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
      }),

      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: {
          align: "right",
        },
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div
              className="flex items-center gap-2 justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setCustomerFormModalOpen(true, customer);
                  }}
                >
                  <Edit />
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
          data={customers.rows}
          emptyMessage="No customers found."
        />
      </motion.div>
    </>
  );
}
