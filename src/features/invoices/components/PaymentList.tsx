"use client";
import { InvoicePayment } from "@/backend/models";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import ColorBadge, { MonoText } from "@/components/presentation";
import { PAYMENT_METHOD_BADGE_COLOR } from "@/lib/definitions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { ReversePaymentButton } from "./ReversePaymentButton";
import { motion } from "framer-motion";
import React from "react";

export default function PaymentList({
  payments,
  canReverse = false,
}: {
  payments: InvoicePayment[];
  canReverse?: boolean;
}) {
  const columnHelper = createColumnHelper<InvoicePayment>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("invoiceId", {
        header: "ID",
        size: 50,
        cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("paymentDate", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Payment Date</ColumnSort>;
        },
        cell: (info) => <MonoText>{formatDate(info.getValue())}</MonoText>,
      }),
      columnHelper.accessor((row: any) => row.user?.name ?? "", {
        id: "userName",
        header: "Logged by",
      }),

      columnHelper.accessor("paymentMethod", {
        header: "Payment Method",
        cell: (info) => (
          <ColorBadge colorMap={PAYMENT_METHOD_BADGE_COLOR}>
            {info.getValue()}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("paymentAmount", {
        header: ({ column }) => {
          return <ColumnSort column={column}>Amount</ColumnSort>;
        },
        meta: {
          align: "right",
        },
        cell: (info) => (
          <span
            className={
              info.row.original.reversedAt
                ? "font-mono text-muted-foreground line-through flex justify-end"
                : "font-mono font-semibold text-primary flex justify-end"
            }
          >
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        meta: { align: "right" },
        cell: (info) => {
          const payment = info.row.original as any;
          if (payment.reversedAt) {
            return (
              <div className="text-right text-xs">
                <span className="font-semibold text-destructive">Reversed</span>
                <div className="text-muted-foreground">
                  {payment.reversedByUser?.name || "N/A"},{" "}
                  {formatDate(payment.reversedAt)}: {payment.reversalReason}
                </div>
              </div>
            );
          }
          return canReverse ? (
            <div className="flex justify-end">
              <ReversePaymentButton
                paymentId={payment.id}
                amount={payment.paymentAmount}
              />
            </div>
          ) : null;
        },
      }),
    ],
    [canReverse],
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
          data={payments}
          emptyMessage="No invoices found."
        />
      </motion.div>
    </>
  );
}
