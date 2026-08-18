"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  OnChangeFn,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cx } from "class-variance-authority";
import React from "react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: TData) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData, index: number) => string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data available",
  className = "",
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      rowSelection: rowSelection ?? internalRowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={cx("overflow-x-auto rounded-xl border shadow-sm", className)}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const align =
                  (header.column.columnDef.meta as any)?.align || "left";

                const alignClass =
                  align === "right"
                    ? "text-right"
                    : align === "center"
                      ? "text-center"
                      : "text-left";

                return (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className={`p-4 ${alignClass}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="p-8 text-center text-muted-foreground"
              >
                <div className="flex items-center justify-center gap-3">
                  <span
                    data-testid="data-table-spinner"
                    className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-primary rounded-full"
                  ></span>
                  <span>Loading table data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="p-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataTable;
