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
import { endOfMonth, startOfMonth } from "date-fns";
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

export default function OrderListFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = new Date(
    Number(searchParams.get("startDate") ?? startOfMonth(new Date())),
  );
  const endDate = new Date(
    Number(searchParams.get("endDate") ?? endOfMonth(new Date())),
  );
  const status = searchParams.get("status") ?? "ALL";
  const paymentStatus = searchParams.get("paymentStatus") ?? "ALL";

  const isToday = startDate.toDateString() === endDate.toDateString();
  const hasFilters = status !== "ALL" || paymentStatus !== "ALL";

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
          date={{ from: startDate, to: endDate }}
          onDateSelect={({ from, to }) =>
            push({
              startDate: String(from.getTime()),
              endDate: String(to.getTime()),
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
            onClick={() => push({ status: null, paymentStatus: null })}
          >
            <X className="size-4" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
