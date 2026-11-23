"use client";

import { cx } from "class-variance-authority";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReportSort } from "./definitions";

const size = 14;

/**
 * A report column header that sorts by its column, kept in the `sort` and
 * `order` search params. The first click sorts ascending, the next descending.
 */
export default function SortableHeader({
  sortKey,
  sort,
  align,
  children,
}: {
  sortKey: string;
  sort: ReportSort | null;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = sort?.key === sortKey ? sort.order : null;

  const params = new URLSearchParams(searchParams);
  params.set("sort", sortKey);
  params.set("order", active === "ASC" ? "DESC" : "ASC");

  return (
    <Link
      href={`${pathname}?${params.toString()}`}
      scroll={false}
      className={cx(
        "inline-flex items-center gap-1 hover:text-foreground",
        align === "right" && "flex-row-reverse",
      )}
    >
      {children}
      {active === "ASC" ? (
        <ArrowUpNarrowWide size={size} />
      ) : active === "DESC" ? (
        <ArrowDownWideNarrow size={size} />
      ) : (
        <ArrowDownUp size={size} className="opacity-50" />
      )}
    </Link>
  );
}
