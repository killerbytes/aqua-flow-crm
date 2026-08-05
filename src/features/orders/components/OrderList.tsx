"use client";
import { Order } from "@/backend/models";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { ColorBadge } from "@/components/ui/presentation";
import {
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
} from "@/lib/definitions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

interface OrderListProps {
  orders: Paginated<Order>;
}

export default function OrderList({ orders }: OrderListProps) {
  const router = useRouter();
  const pathname = usePathname();

  const columnHelper = createColumnHelper<Order>();
  const columns = React.useMemo(
    () =>
      [
        columnHelper.accessor("orderId", {
          header: "Order ID",
          cell: (info) => <span className="font-mono">#{info.getValue()}</span>,
        }),
        !pathname.startsWith("/customers") &&
          columnHelper.accessor("customer.name", {
            header: "Name",
            cell: (info) => {
              const order = info.row.original;
              const customerId = order.customerId;
              return (
                <Link
                  onClick={(e) => e.stopPropagation()}
                  href={`/customers/${customerId}`}
                  className="font-medium text-primary hover:text-primary hover:underline"
                >
                  {info.getValue()}
                </Link>
              );
            },
          }),
        columnHelper.accessor("createdAt", {
          header: "Date Ordered",
          cell: (info) => (
            <span className="font-mono font-semibold text-xs">
              {formatDateTime(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => (
            <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
              {info.getValue()}
            </ColorBadge>
          ),
        }),
        columnHelper.accessor("paymentStatus", {
          header: "Payment Status",
          cell: (info) => (
            <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
              {info.getValue()}
            </ColorBadge>
          ),
        }),

        columnHelper.accessor("totalAmount", {
          header: "Total Amount",
          cell: (info) => (
            <span className="font-mono font-semibold text-primary flex justify-end">
              {formatCurrency(info.getValue())}
            </span>
          ),
        }),
      ].filter(Boolean) as any[],
    [pathname],
  );

  return (
    <>
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={orders.rows}
          emptyMessage="No orders found."
          onRowClick={(row) => router.push(`/orders/${row.orderId}`)}
        />
        <Pager initial={orders.pagination} />
      </motion.div>
    </>
  );
}
