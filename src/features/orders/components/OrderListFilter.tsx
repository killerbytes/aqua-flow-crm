"use client";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { endOfMonth, startOfMonth } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

export default function OrderListFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const isToday = startDate === endDate;

  const toggleDateHandler = () => {
    const today = new Date();
    const params = new URLSearchParams(searchParams);
    params.set(
      "startDate",
      isToday ? String(startOfMonth(today).getTime()) : String(today.getTime()),
    );
    params.set(
      "endDate",
      isToday ? String(endOfMonth(today).getTime()) : String(today.getTime()),
    );
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <DatePicker
        onSelect={(range) => {
          router.push(
            `?startDate=${range?.from?.getTime()}&endDate=${range?.to?.getTime()}`,
          );
        }}
        from={new Date(Number(startDate ?? startOfMonth(new Date())))}
        to={new Date(Number(endDate ?? endOfMonth(new Date())))}
      />

      <Button onClick={toggleDateHandler}>
        {isToday ? "This Month" : "Today"}
      </Button>
    </div>
  );
}
