"use client";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const GROUPS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Day, week, or month totals, kept in the `group` search param. */
export default function GroupFilter({ group }: { group: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">By</span>
      <div className="flex gap-1">
        {GROUPS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={option.value === group ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("group", option.value);
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
