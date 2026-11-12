"use client";

import type { OrderSchema } from "@/backend/schemas/zodSchemas";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";

type OrderForm = UseFormReturn<
  z.input<typeof OrderSchema>,
  unknown,
  z.output<typeof OrderSchema>
>;

/** What the surcharge starts at, in pesos. Staff can change it per order. */
export const DEFAULT_ORDER_SURCHARGE = 5;

/**
 * The order's optional surcharge: a checkbox and an amount staff can change.
 * It is on for an order of a single unit, and switches itself off when the
 * order grows past that. Staff can still switch it back on for a larger order.
 */
export function OrderSurchargeField({ form }: { form: OrderForm }) {
  const { control, setValue, formState } = form;
  const items = useWatch({ control, name: "items" }) || [];
  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0),
    0,
  );
  const isSingleUnit = totalQuantity === 1;

  const [checked, setChecked] = useState(isSingleUnit);
  const [amount, setAmount] = useState(String(DEFAULT_ORDER_SURCHARGE));

  // Follow the quantity only when it crosses between one unit and more, so a
  // choice staff made by hand survives other quantity changes.
  const [wasSingleUnit, setWasSingleUnit] = useState(isSingleUnit);
  if (wasSingleUnit !== isSingleUnit) {
    setWasSingleUnit(isSingleUnit);
    setChecked(isSingleUnit);
  }

  const surcharge = checked ? Number(amount) || 0 : 0;
  useEffect(() => {
    setValue("surcharge", surcharge, { shouldValidate: true });
  }, [setValue, surcharge]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          Surcharge
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          aria-label="Surcharge amount"
          aria-invalid={!!formState.errors.surcharge}
          className="w-28 text-right"
          disabled={!checked}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <FieldError>{formState.errors.surcharge?.message}</FieldError>
    </div>
  );
}
