"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { businessDateKey, startOfBusinessDay } from "@/lib/business-time";
import { MAX_ORDER_BACKDATE_DAYS } from "@/lib/definitions";
import { Calendar } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

/** Any form with a `createdAt` date: the order form or the walk-in sales form. */
interface DatedForm {
  register: (name: "createdAt") => UseFormRegisterReturn<"createdAt">;
  formState: { errors: { createdAt?: { message?: string } } };
}

/**
 * Today's Philippine date as YYYY-MM-DD, what the order date starts at. Taken
 * in Philippine time, so before 8 AM it isn't still yesterday's UTC date.
 */
export const todayOrderDate = () => businessDateKey(new Date());

/**
 * The earliest date an order can be given, as YYYY-MM-DD. An order being
 * edited may already be older than that, and can keep its own date.
 */
const earliestOrderDate = (current?: string) => {
  const limit = businessDateKey(
    startOfBusinessDay(new Date(), -MAX_ORDER_BACKDATE_DAYS),
  );
  return current && current < limit ? current : limit;
};

/**
 * The date of an order. Staff can set an earlier day for an order taken
 * before it was entered, up to MAX_ORDER_BACKDATE_DAYS back, when placing it
 * or while it is pending. The server keeps the current time of day and refuses
 * dates outside that range.
 */
export function OrderDateField({
  form,
  label = "Order Date",
  current,
}: {
  form: DatedForm;
  label?: string;
  /** The date already on an order being edited, as YYYY-MM-DD. */
  current?: string;
}) {
  const { register, formState } = form;
  const error = formState.errors.createdAt?.message;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="order-date" className="flex items-center gap-1">
        <Calendar size={14} /> {label}
      </FieldLabel>
      <Input
        id="order-date"
        type="date"
        min={earliestOrderDate(current)}
        max={todayOrderDate()}
        {...register("createdAt")}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
