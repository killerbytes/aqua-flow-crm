"use client";
import { OrderDetail } from "@/backend/models";
import DataTable from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
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
      columnHelper.accessor("detailId", {
        header: "ID",
        size: 50,
        cell: (info) => <span className="font-mono">#{info.getValue()}</span>,
      }),

      columnHelper.accessor("product.name", {
        header: "Product",
        cell: (info) => info.getValue() || "[Deleted]",
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        meta: {
          align: "right",
        },
        cell: (info) => (
          <div className="justify-end flex">
            <Badge>{info.getValue()}</Badge>
          </div>
        ),
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
        meta: {
          align: "right",
        },
        cell: (info) => {
          const detail = info.row.original;
          const netPrice = Math.max(
            0,
            detail.unitPrice - (detail.discount || 0),
          );
          return (
            <span className="font-mono font-bold text-primary flex justify-end">
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
