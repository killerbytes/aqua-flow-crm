"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUSINESS_TIMEZONE } from "@/lib/business-time";
import {
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";

/** Preset ranges, worked out on Philippine dates. */
const presets = () => {
  const today = toZonedTime(new Date(), BUSINESS_TIMEZONE);
  const key = (date: Date) => format(date, "yyyy-MM-dd");
  const lastMonth = subMonths(today, 1);
  return [
    { label: "Today", from: key(today), to: key(today) },
    {
      label: "This week",
      from: key(startOfWeek(today, { weekStartsOn: 1 })),
      to: key(today),
    },
    { label: "This month", from: key(startOfMonth(today)), to: key(today) },
    {
      label: "Last month",
      from: key(startOfMonth(lastMonth)),
      to: key(endOfMonth(lastMonth)),
    },
  ];
};

/** From and to dates, both included, kept in the `from` and `to` search params. */
export default function DateRangeFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ranges, setRanges] = React.useState<ReturnType<typeof presets>>([]);

  // Worked out after mounting, so the server and browser render the same.
  React.useEffect(() => setRanges(presets()), []);

  const apply = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="range-from" className="text-muted-foreground">
        From
      </label>
      <Input
        id="range-from"
        type="date"
        value={from}
        max={to}
        onChange={(e) => e.target.value && apply({ from: e.target.value })}
        className="h-8 w-38"
      />
      <label htmlFor="range-to" className="text-muted-foreground">
        to
      </label>
      <Input
        id="range-to"
        type="date"
        value={to}
        min={from}
        onChange={(e) => e.target.value && apply({ to: e.target.value })}
        className="h-8 w-38"
      />
      <div className="flex flex-wrap gap-1">
        {ranges.map((range) => (
          <Button
            key={range.label}
            size="sm"
            variant={
              range.from === from && range.to === to ? "default" : "outline"
            }
            className="h-7 px-2 text-xs"
            onClick={() => apply(range)}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
