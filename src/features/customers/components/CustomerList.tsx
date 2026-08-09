"use client";
import { Customer } from "@/backend/models";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { CustomerName, MonoText } from "@/components/presentation";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React from "react";

interface CustomerListProps {
  customers: Paginated<Customer>;
}

export default function CustomerList({ customers }: CustomerListProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState();

  const columnHelper = createColumnHelper<Customer>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("customerId", {
        header: "ID",
        cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Name</ColumnSort>;
        },
        cell: (info) => {
          const customer = info.row.original;
          return <CustomerName customer={customer} />;
        },
      }),

      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <MonoText>{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("address", {
        header: "Address",
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor("barangay", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Barangay</ColumnSort>;
        },
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
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
        className="space-y-4"
      >
        <DataTable
          columns={columns}
          data={customers.rows}
          emptyMessage="No customers found."
          onRowClick={(row) => router.push(`/customers/${row.customerId}`)}
        />
        {customers.pagination && customers.pagination.totalPages > 1 && (
          <Pager initial={customers.pagination} />
        )}
      </motion.div>
    </>
  );
}
