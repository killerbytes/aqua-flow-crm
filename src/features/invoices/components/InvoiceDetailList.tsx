"use client";
import { InvoiceDetail } from "@/backend/models";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import ColorBadge, { MonoText } from "@/components/presentation";
import {
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
} from "@/lib/definitions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import React from "react";

export default function InvoiceDetailList({
  invoiceDetails,
}: {
  invoiceDetails: InvoiceDetail[];
}) {
  const columnHelper = createColumnHelper<InvoiceDetail>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("orderId", {
        header: "ID",
        size: 50,
        cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Order Date</ColumnSort>;
        },
        cell: (info) => <MonoText>{formatDate(info.getValue())}</MonoText>,
      }),

      columnHelper.accessor((row: any) => row.order?.status, {
        id: "orderStatus",
        header: "Status",
        cell: (info) => (
          <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
            {info.getValue()}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor((row: any) => row.order?.paymentStatus, {
        id: "orderPaymentStatus",
        header: "Payment Status",
        cell: (info) => (
          <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
            {info.getValue()}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor((row: any) => row.order?.totalAmount, {
        id: "orderAmount",
        header: ({ column }) => {
          return <ColumnSort column={column}>Amount</ColumnSort>;
        },
        meta: {
          align: "right",
        },
        cell: (info) => (
          <span className="font-mono font-semibold text-primary flex justify-end">
            {formatCurrency(info.getValue())}
          </span>
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
          data={invoiceDetails}
          emptyMessage="No invoices found."
        />
      </motion.div>
    </>
  );
}
