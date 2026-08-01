"use client";
import { Customer } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import useToggle from "@/hooks/use-toggle";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import Link from "next/link";
import React from "react";
// import CustomerFormModal from "./CustomerFormModal";
// import SpecialPricingModal from "./SpecialPricingModal";

interface CustomerListProps {
  customers: Paginated<Customer>;
}

export default function CustomerList({ customers }: CustomerListProps) {
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<Customer | null>(null);
  const { toggle, handleToggle } = useToggle({
    isPricingModalOpen: false,
    isFormOpen: false,
  });

  const columnHelper = createColumnHelper<Customer>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("customerId", {
        header: "Customer ID",
        cell: (info) => (
          <span className="font-mono font-semibold ">#{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => {
          const customer = info.row.original;
          return (
            <Link
              onClick={(e) => e.stopPropagation()}
              href={`/customers/${customer.customerId}`}
              className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
            >
              {info.getValue()}
            </Link>
          );
        },
      }),

      columnHelper.accessor("phone", {
        header: "Phone",
      }),
      columnHelper.accessor("barangay", {
        header: "Barangay",
      }),

      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: {
          align: "right",
        },
        cell: (info) => {
          const customer = info.row.original;
          const hasSpecialPricing = (customer.specialPricings?.length ?? 0) > 0;
          return (
            <div
              className="flex items-center gap-2 justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <RoleGuard allowedRoles={["Admin"]}>
                <Button
                  size="icon"
                  variant={hasSpecialPricing ? "default" : "outline"}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    handleToggle({ isPricingModalOpen: true });
                  }}
                >
                  <Tag />
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
      {/* <CustomerFilter barangayPromise={barangayPromise} /> */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={customers.rows}
          emptyMessage="No customers found."
          onRowClick={(row) => setSelectedCustomer(row)}
        />
      </motion.div>
      {/* {(customers.pagination?.totalPages ?? 0) > 1 && (
        <Pager initial={customers.pagination} />
      )} */}
      {/* <Suspense fallback={null}>
        {toggle.isPricingModalOpen && (
          <SpecialPricingModal
            customer={selectedCustomer}
            onClose={() => {
              handleToggle({
                isPricingModalOpen: false,
              });
              setSelectedCustomer(null);
            }}
          />
        )}
        {toggle.isFormOpen && (
          <CustomerFormModal
            barangayPromise={barangayPromise}
            customer={null}
            onClose={() => handleToggle({ isFormOpen: false })}
          />
        )}
      </Suspense> */}
    </>
  );
}
