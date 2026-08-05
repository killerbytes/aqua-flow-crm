"use client";

import { InventoryAdjustment } from "@/backend/models";
import { ColorBadge, MonoText } from "@/components/ui/presentation";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_BADGE_COLOR } from "@/lib/definitions";
import { formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { use } from "react";

interface InventoryLogsProps {
  inventoryAdjustmentPromise: Promise<Paginated<InventoryAdjustment>>;
}

export default function InventoryLogs({
  inventoryAdjustmentPromise,
}: InventoryLogsProps) {
  const data = use(inventoryAdjustmentPromise);

  const columnHelper = createColumnHelper<InventoryAdjustment>();
  const columns = [
    columnHelper.accessor("adjustmentId", {
      header: "Log ID",
      cell: (info) => (
        <MonoText className="font-semibold">#{info.getValue()}</MonoText>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
    }),
    columnHelper.accessor("product.name", {
      header: "Product",
      cell: (info) => info.getValue() || "N/A",
    }),
    columnHelper.accessor("adjustmentType", {
      header: "Type",
      cell: (info) => {
        const action = info.getValue();
        return (
          <ColorBadge colorMap={EQUIPMENT_BADGE_COLOR}>{action}</ColorBadge>
        );
      },
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
    columnHelper.accessor("reason", {
      header: "Reason",
      meta: {
        align: "right",
      },
      cell: (info) => (
        <span className="font-semibold text-right block">
          {info.getValue()}
        </span>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data?.rows || []}
        emptyMessage="No equipment logs found."
      />
      {(data.pagination?.totalPages ?? 0) > 1 && (
        <Pager initial={data.pagination} />
      )}
    </div>
  );
}
