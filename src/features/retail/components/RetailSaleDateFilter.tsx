"use client";

import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { businessDateKey, parseBusinessDateKey } from "@/lib/business-time";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The calendar the orders list uses, for a range kept as Philippine dates
 * (YYYY-MM-DD) in the `from` and `to` search params, both days included.
 * Picking a range starts the paged list over from page 1.
 */
export default function RetailSaleDateFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <CalendarDatePicker
      id="retail-sales-range"
      date={{
        from: parseBusinessDateKey(from) ?? undefined,
        to: parseBusinessDateKey(to) ?? undefined,
      }}
      onDateSelect={(range) => {
        const params = new URLSearchParams(searchParams);
        // The picker sends the start of the first day and the end of the
        // last, so each names its own Philippine date.
        params.set("from", businessDateKey(range.from));
        params.set("to", businessDateKey(range.to));
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
