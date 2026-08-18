"use client";
import { Order } from "@/backend/models";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { ColorBadge, CustomerName, MonoText } from "@/components/presentation";
import {
  CustomerStatus,
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_METHOD_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
  PaymentStatus,
} from "@/lib/definitions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
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
          cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
        }),
        !pathname.startsWith("/customers") &&
          columnHelper.accessor("customer.name", {
            header: ({ column }) => {
              return <ColumnSort column={column}>Name</ColumnSort>;
            },
            cell: (info) => {
              const order = info.row.original;
              const customerId = order.customerId;

              const hasSpecialPricing =
                (order.customer?.specialPricings?.length ?? 0) > 0;

              return (
                <Link
                  onClick={(e) => e.stopPropagation()}
                  href={`/customers/${customerId}`}
                  className={cx(
                    "font-medium text-primary",
                    order.customer.status === CustomerStatus.INACTIVE
                      ? "opacity-60"
                      : "opacity-100",
                  )}
                >
                  <CustomerName customer={order.customer} />
                </Link>
              );
            },
          }),
        columnHelper.accessor("createdAt", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Date Ordered</ColumnSort>;
          },
          cell: (info) => (
            <MonoText>{formatDateTime(info.getValue())}</MonoText>
          ),
        }),
        columnHelper.accessor("status", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Status</ColumnSort>;
          },
          cell: (info) => (
            <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
              {info.getValue()}
            </ColorBadge>
          ),
        }),
        columnHelper.accessor("paymentStatus", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Payment Status</ColumnSort>;
          },
          cell: (info) => (
            <div className="space-x-1">
              <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
                {info.getValue()}
              </ColorBadge>
              {info.getValue() === PaymentStatus.PAID && (
                <ColorBadge colorMap={PAYMENT_METHOD_BADGE_COLOR}>
                  {info.row.original.paymentMethod}
                </ColorBadge>
              )}
            </div>
          ),
        }),

        columnHelper.accessor("totalAmount", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Total Amount</ColumnSort>;
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
        {orders.pagination && orders.pagination.totalPages > 1 && (
          <Pager initial={orders.pagination} />
        )}
      </motion.div>
    </>
  );
}
