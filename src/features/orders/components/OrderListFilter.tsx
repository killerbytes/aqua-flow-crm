"use client";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { endOfMonth, startOfMonth } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

export default function OrderListFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = new Date(
    Number(searchParams.get("startDate") ?? startOfMonth(new Date()))
  );
  const endDate = new Date(
    Number(searchParams.get("endDate") ?? endOfMonth(new Date()))
  );

  const isToday = startDate.toDateString() === endDate.toDateString();

  const toggleDateHandler = () => {
    const today = new Date();
    const params = new URLSearchParams(searchParams);
    params.set(
      "startDate",
      isToday ? String(startOfMonth(today).getTime()) : String(today.getTime())
    );
    params.set(
      "endDate",
      isToday ? String(endOfMonth(today).getTime()) : String(today.getTime())
    );
    router.push(`?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value ?? OrderStatus.PENDING);
    }
    router.push(`?${params.toString()}`);
  };

  const handlePaymentStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") {
      params.delete("paymentStatus");
    } else {
      params.set("paymentStatus", value ?? PaymentStatus.UNPAID);
    }
    router.push(`?${params.toString()}`);
  };
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <CalendarDatePicker
          date={{ from: startDate, to: endDate }}
          onDateSelect={({ from, to }) => {
            router.push(
              `?startDate=${from.getTime()}&endDate=${to.getTime()}`
            );
          }}
        />

        <Button onClick={toggleDateHandler} size="xs">
          {isToday ? "This Month" : "Today"}
        </Button>
      </div>

      <Field orientation="horizontal" className="w-fit">
        <FieldLabel>Status</FieldLabel>
        <Select
          defaultValue={searchParams.get("status") ?? "ALL"}
          onValueChange={(value) => handleStatusChange(value ?? "ALL")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="ALL">
              ALL
            </SelectItem>
            {Object.values(OrderStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="horizontal" className="w-fit">
        <FieldLabel>Payment Status</FieldLabel>
        <Select
          defaultValue={searchParams.get("paymentStatus") ?? "ALL"}
          onValueChange={(value) => handlePaymentStatusChange(value ?? "ALL")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="ALL">
              ALL
            </SelectItem>
            {Object.values(PaymentStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
