"use client";

import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { ColorBadge, MonoText } from "@/components/presentation";
import { Badge } from "@/components/ui/badge";
import {
  EQUIPMENT_BADGE_COLOR,
  LEDGER_ACCOUNT_LABELS,
} from "@/lib/definitions";
import { formatDateTime } from "@/lib/utils";
import { Paginated } from "@/types";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface EquipmentLogsProps {
  logsPromise: Promise<Paginated<any>>;
}

export default function EquipmentLogs({ logsPromise }: EquipmentLogsProps) {
  const data = use(logsPromise);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("logId", {
      header: "Log ID",
      size: 50,

      cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
    }),
    columnHelper.accessor("customer.name", {
      header: "Customer",
      cell: (info) => {
        const row = info.row.original;
        const custId = row.customerId || row.toAccountId || row.fromAccountId;
        const name =
          row.customer?.name ||
          (custId ? `Customer #${custId}` : "Station / Supplier");

        if (custId && row.customer?.name) {
          return (
            <Link
              href={`/customers/${custId}`}
              className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
            >
              {name}
            </Link>
          );
        }
        return <span className="text-muted-foreground">{name}</span>;
      },
    }),
    columnHelper.accessor("product.name", {
      header: "Product",
      cell: (info) => info.getValue() || "N/A",
    }),

    columnHelper.accessor("fromAccountType", {
      header: "Ledger Transfer (From -> To)",
      cell: (info) => {
        const row = info.row.original;
        const fromLabel =
          LEDGER_ACCOUNT_LABELS[
            row.fromAccountType as keyof typeof LEDGER_ACCOUNT_LABELS
          ] ||
          row.fromAccountType ||
          "STATION";
        const toLabel =
          LEDGER_ACCOUNT_LABELS[
            row.toAccountType as keyof typeof LEDGER_ACCOUNT_LABELS
          ] ||
          row.toAccountType ||
          "CUSTOMER";

        return (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium">
              {fromLabel}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium">
              {toLabel}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: (info) => <MonoText>{formatDateTime(info.getValue())}</MonoText>,
    }),

    columnHelper.accessor("actionType", {
      header: "Action / Type",
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
      cell: (info) => {
        const row = info.row.original;
        const isReturn =
          row.actionType === "RETURNED" ||
          row.actionType === "TEMPORARY_RETURNED" ||
          row.fromAccountType === "CUSTOMER" ||
          row.fromAccountType === "CUSTOMER_TEMP";

        return (
          <div className="justify-end flex">
            <Badge
              variant={isReturn ? "outline" : "default"}
              className="font-mono"
            >
              {isReturn ? `-${info.getValue()}` : `+${info.getValue()}`}
            </Badge>
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data?.rows || []}
        emptyMessage="No equipment ledger entries found."
      />
      {(data.pagination?.totalPages ?? 0) > 1 && (
        <Pager initial={data.pagination} />
      )}
    </div>
  );
}
