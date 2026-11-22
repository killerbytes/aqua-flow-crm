"use client";

import { errorMessage } from "@/lib/errors";
import { recordWalkInSaleAction } from "@/backend/actions";
import {
  WalkInSaleFormData,
  WalkInSaleSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { OrderDateField, todayOrderDate } from "./OrderDateField";

const WalkInSalesModalContent = () => {
  const router = useRouter();
  const setWalkInModalOpen = useUIStore((state) => state.setWalkInModalOpen);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(WalkInSaleSchema),
    defaultValues: { createdAt: todayOrderDate() },
  });
  const { handleSubmit, control, formState } = form;

  const onSubmit = (data: WalkInSaleFormData) => {
    startTransition(async () => {
      try {
        const res = await recordWalkInSaleAction(data);
        if (!res.success) {
          throw new Error(res.error);
        }

        toast.add({
          type: "success",
          title: `Walk-in sales of ${formatCurrency(data.amount)} recorded`,
        });

        setWalkInModalOpen(false);
        router.refresh();
      } catch (err) {
        toast.add({
          type: "error",
          priority: "high",
          title: errorMessage(err) || "Failed to record walk-in sales",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <OrderDateField form={form} label="Sale Date" />

      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <Field data-invalid={!!formState.errors.amount}>
            <FieldLabel htmlFor="walk-in-amount">Total Cash Sales (P)</FieldLabel>
            <Input
              id="walk-in-amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              autoFocus
              className="text-right text-lg tabular-nums"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onChange={(e) =>
                field.onChange(
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
            />
            <FieldError>{formState.errors.amount?.message}</FieldError>
          </Field>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Recorded as paid in cash. Several entries can go on the same day; a
        wrong one can be voided from its order page.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setWalkInModalOpen(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          {isPending ? "Recording..." : "Record Walk-In Sales"}
        </Button>
      </div>
    </form>
  );
};

export const WalkInSalesModal = () => {
  const { isWalkInModalOpen, setWalkInModalOpen } = useUIStore();

  // The content mounts on open, so each sale starts from a fresh form.
  if (!isWalkInModalOpen) return null;

  return (
    <Modal
      title={
        <>
          <Store />
          Walk-In Sales
        </>
      }
      description="Record the day's over-the-counter cash sales as one total."
      isOpen={isWalkInModalOpen}
      onClose={() => setWalkInModalOpen(false)}
    >
      <WalkInSalesModalContent />
    </Modal>
  );
};
