"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";

const PRESETS = [7, 14, 30, 60, 90];

/** "No order in at least N days", kept in the `days` search param. */
export default function DaysFilter({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [input, setInput] = React.useState(String(days));
  const debounced = useDebounce(input, 400);

  React.useEffect(() => setInput(String(days)), [days]);

  const apply = React.useCallback(
    (value: string) => {
      const next = Number(value);
      if (value === "" || !Number.isInteger(next) || next < 0) return;
      if (next === days) return;
      const params = new URLSearchParams(searchParams);
      params.set("days", String(next));
      router.push(`${pathname}?${params.toString()}`);
    },
    [days, pathname, router, searchParams],
  );

  // Only when the typed value settles. Running on every `days` change too would
  // push a stale value back after the browser's Back button.
  React.useEffect(() => {
    if (debounced === input) apply(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="days-filter" className="text-muted-foreground">
        No order in at least
      </label>
      <Input
        id="days-filter"
        type="number"
        min={0}
        step={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="h-8 w-20"
      />
      <span className="text-muted-foreground">days</span>
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={preset === days ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => {
              setInput(String(preset));
              apply(String(preset));
            }}
          >
            {preset}d
          </Button>
        ))}
      </div>
    </div>
  );
}
