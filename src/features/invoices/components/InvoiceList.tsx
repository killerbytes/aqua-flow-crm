"use client";
import { Invoice } from "@/backend/models";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import ColorBadge, { CustomerName, MonoText } from "@/components/presentation";
import { INVOICE_STATUS_BADGE_COLOR } from "@/lib/definitions";
import { formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

interface InvoiceListProps {
  invoices: Paginated<Invoice>;
}

export default function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter();

  const columnHelper = createColumnHelper<Invoice>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("invoiceId", {
        header: "ID",
        size: 50,

        cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("customer.name", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Name</ColumnSort>;
        },
        cell: (info) => {
          const invoice = info.row.original;
          const customerId = invoice.customerId;

          return (
            <Link
              onClick={(e) => e.stopPropagation()}
              href={`/customers/${customerId}`}
              className={cx("font-medium text-primary")}
            >
              <CustomerName customer={invoice?.customer} />
            </Link>
          );
        },
      }),

      columnHelper.accessor("dateIssued", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Date Issued</ColumnSort>;
        },
        cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
      }),
      columnHelper.accessor("dueDate", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Date Issued</ColumnSort>;
        },
        cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
      }),

      columnHelper.accessor("paymentDate", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Payment Date</ColumnSort>;
        },
        cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <ColorBadge colorMap={INVOICE_STATUS_BADGE_COLOR}>
            {info.getValue()}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("amount", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Amount</ColumnSort>;
        },
        meta: {
          align: "right",
        },
        cell: (info) => (
          <MonoText className="flex justify-end font-semibold">
            {info.getValue()}
          </MonoText>
        ),
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
          data={invoices.rows}
          emptyMessage="No invoices found."
          onRowClick={(row) => router.push(`/invoices/${row.invoiceId}`)}
        />
        {invoices.pagination && invoices.pagination.totalPages > 1 && (
          <Pager initial={invoices.pagination} />
        )}
      </motion.div>
    </>
  );
}
