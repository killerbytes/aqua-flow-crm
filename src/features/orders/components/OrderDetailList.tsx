"use client";
import { OrderDetail } from "@/backend/models";
import DataTable from "@/components/DataTable";
import { formatCurrency } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";

export default function OrderDetailList({
  orderDetails,
}: {
  orderDetails: OrderDetail[];
}) {
  const columnHelper = createColumnHelper<OrderDetail>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("orderId", {
        header: "Order ID",
        cell: (info) => <span className="font-mono">#{info.getValue()}</span>,
      }),

      columnHelper.accessor("product.name", {
        header: "Product",
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
      }),
      columnHelper.accessor("unitPrice", {
        header: "Unit Price",
        cell: (info) => (
          <span className="font-mono">{formatCurrency(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("discount", {
        header: "Discount",
        cell: (info) => {
          const discount = info.getValue() || 0;
          return discount > 0 ? (
            <span className="font-mono text-emerald-600 font-semibold">
              -{formatCurrency(discount)}
            </span>
          ) : (
            <span className="font-mono text-muted-foreground">-</span>
          );
        },
      }),
      columnHelper.display({
        id: "subtotal",
        header: "Subtotal",
        cell: (info) => {
          const detail = info.row.original;
          const netPrice = Math.max(0, detail.unitPrice - (detail.discount || 0));
          return (
            <span className="font-mono font-bold text-primary">
              {formatCurrency(netPrice * detail.quantity)}
            </span>
          );
        },
      }),
    ],
    [],
  );
  return <DataTable columns={columns} data={orderDetails} />;
}
