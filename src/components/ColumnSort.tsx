import { Column } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const size = 14;
export default function ColumnSort<T>({
  column,
  children,
  className,
}: {
  column: Column<T, unknown>;
  children: React.ReactNode;
  className?: string | string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  const order = searchParams.get("order");

  const createPageURL = (filters: [string, string][]) => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    params.delete("sort");
    params.delete("order");
    filters.forEach(([key, value]) => {
      params.set(key, value);
    });
    router.push(`?${params.toString()}`);
  };
  const { align = "left" } = (column.columnDef.meta as any) || {};
  const alignClass =
    align === "right"
      ? "justify-end"
      : align === "left"
        ? "justify-start"
        : "justify-center";

  return (
    <span
      className={cx(
        "flex items-center gap-1 cursor-pointer",
        className,
        alignClass,
      )}
      onClick={() => {
        createPageURL([
          ["sort", String(column.id)],
          ["order", order === "ASC" ? "DESC" : "ASC"],
        ]);
      }}
    >
      {children}
      {sort === column.id && order === "ASC" ? (
        <ArrowUpNarrowWide size={size} />
      ) : (
        sort === column.id && <ArrowDownWideNarrow size={size} />
      )}

      {sort !== column.id && <ArrowDownUp className="opacity-50" size={size} />}
    </span>
  );
}
