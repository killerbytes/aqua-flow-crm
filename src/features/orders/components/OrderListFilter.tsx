"use client";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  ALL: "All statuses",
  [OrderStatus.PENDING]: "Pending",
  [OrderStatus.OUT_FOR_DELIVERY]: "Out for delivery",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled",
};

const PAYMENT_LABELS: Record<string, string> = {
  ALL: "Paid and unpaid",
  [PaymentStatus.PAID]: "Paid",
  [PaymentStatus.UNPAID]: "Unpaid",
};

/**
 * `startDate` and `endDate` are the range the server applied, as millisecond
 * timestamps: today when the URL names none, or empty for all time.
 */
export default function OrderListFilter({
  startDate: startParam,
  endDate: endParam,
}: {
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = startParam ? new Date(Number(startParam)) : undefined;
  const endDate = endParam ? new Date(Number(endParam)) : undefined;
  const status = searchParams.get("status") ?? "ALL";
  const paymentStatus = searchParams.get("paymentStatus") ?? "ALL";

  // Today is the default, so only a range set in the URL counts as a filter.
  const hasFilters =
    ["startDate", "endDate", "range"].some((key) => searchParams.has(key)) ||
    status !== "ALL" ||
    paymentStatus !== "ALL";

  /** Applies changes to the current filters, starting again from page 1. */
  const push = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };


  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div className="flex items-center gap-2">
        <CalendarDatePicker
          // A range open at one end only shows its known end on both sides.
          date={{ from: startDate ?? endDate, to: endDate ?? startDate }}
          placeholder="All time"
          onClear={() => push({ startDate: null, endDate: null, range: "all" })}
          onDateSelect={({ from, to }) =>
            push({
              startDate: String(from.getTime()),
              endDate: String(to.getTime()),
              range: null,
            })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <Select
          value={status}
          onValueChange={(value) =>
            push({ status: !value || value === "ALL" ? null : String(value) })
          }
        >
          <SelectTrigger className="min-w-40" aria-label="Order status">
            <SelectValue>{(value: string) => STATUS_LABELS[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus}
          onValueChange={(value) =>
            push({
              paymentStatus: !value || value === "ALL" ? null : String(value),
            })
          }
        >
          <SelectTrigger className="min-w-40" aria-label="Payment status">
            <SelectValue>
              {(value: string) => PAYMENT_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              push({
                status: null,
                paymentStatus: null,
                startDate: null,
                endDate: null,
                range: null,
              })
            }
          >
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
