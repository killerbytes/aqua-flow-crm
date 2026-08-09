"use client";

import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import Pager from "@/components/Pager";
import { MonoText } from "@/components/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import { formatDateTime } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Calendar, Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function LastOrderList({ customers }: { customers: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDays = searchParams.get("days") || "";
  const [daysInput, setDaysInput] = React.useState(currentDays);

  const debouncedDays = useDebounce(daysInput, 400);

  const setDaysFilter = React.useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      if (val !== undefined && val !== null && val !== "") {
        params.set("days", val);
      } else {
        params.delete("days");
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    if (debouncedDays !== currentDays) {
      setDaysFilter(debouncedDays);
    }
  }, [debouncedDays, currentDays, setDaysFilter]);

  const columnHelper = createColumnHelper<any>();
  const columns = React.useMemo(
    () => [
      columnHelper.accessor("customerId", {
        header: ({ column }) => <ColumnSort column={column}>ID</ColumnSort>,
        cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
      }),
      columnHelper.accessor("customerName", {
        header: ({ column }) => <ColumnSort column={column}>Name</ColumnSort>,
      }),
      columnHelper.accessor("daysSinceLastOrder", {
        header: ({ column }) => (
          <ColumnSort column={column}>Days Since Last Order</ColumnSort>
        ),
        cell: (info) => <MonoText>{info.getValue() ?? "N/A"}</MonoText>,
      }),
      columnHelper.accessor("lastOrderDate", {
        header: ({ column }) => (
          <ColumnSort column={column}>Last Order</ColumnSort>
        ),
        cell: (info) =>
          info.getValue() ? (
            <MonoText>{formatDateTime(info.getValue())}</MonoText>
          ) : (
            <span className="text-xs text-muted-foreground">No orders</span>
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter Days Idle:</span>
            </div>
            <div className="relative w-36">
              <Input
                type="number"
                min="0"
                placeholder="Min days (e.g. 7)"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="h-8 pr-7 text-xs"
              />
              {daysInput && (
                <button
                  onClick={() => {
                    setDaysInput("");
                    setDaysFilter("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Presets:
            </span>
            <Button
              variant={!currentDays ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setDaysInput("");
                setDaysFilter("");
              }}
            >
              All
            </Button>
            {[7, 14, 30].map((preset) => (
              <Button
                key={preset}
                variant={currentDays === String(preset) ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setDaysInput(String(preset));
                  setDaysFilter(String(preset));
                }}
              >
                ≥ {preset} Days
              </Button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={customers.rows}
          emptyMessage="No customers found matching the days criteria."
        />
        {customers.pagination && customers.pagination.totalPages > 1 && (
          <Pager initial={customers.pagination} />
        )}
      </motion.div>
    </>
  );
}
