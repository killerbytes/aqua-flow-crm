"use client";

import { EquipmentLog } from "@/backend/models";
import { ColorBadge, MonoText } from "@/components/ui/presentation";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_BADGE_COLOR } from "@/lib/definitions";
import { formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { use } from "react";

interface EquipmentLogsProps {
  logsPromise: Promise<Paginated<EquipmentLog>>;
}

export default function EquipmentLogs({ logsPromise }: EquipmentLogsProps) {
  const data = use(logsPromise);

  const columnHelper = createColumnHelper<EquipmentLog>();
  const columns = [
    columnHelper.accessor("logId", {
      header: "Log ID",
      cell: (info) => (
        <MonoText className="font-semibold">#{info.getValue()}</MonoText>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
    }),
    columnHelper.accessor("customer.name", {
      header: "Customer Name",
      cell: (info) => {
        const customer = info.row.original;

        return (
          <Link
            href={`/customers/${customer?.customerId}`}
            className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
          >
            {customer?.customer?.name}
          </Link>
        );
      },
    }),
    columnHelper.accessor("product.name", {
      header: "Product",
      cell: (info) => info.getValue() || "N/A",
    }),
    columnHelper.accessor("actionType", {
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
