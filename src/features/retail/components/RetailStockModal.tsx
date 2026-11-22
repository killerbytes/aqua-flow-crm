"use client";

import { adjustRetailStockAction } from "@/backend/actions";
import {
  RetailStockAdjustmentFormData,
  RetailStockAdjustmentSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  RETAIL_STOCK_ADJUSTMENT_OPTIONS,
  RetailStockEntryType,
} from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";

function RetailStockModalContent() {
  const router = useRouter();
  const { setRetailStockModalOpen, stockRetailProduct: product } =
    useUIStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RetailStockAdjustmentFormData>({
    resolver: zodResolver(RetailStockAdjustmentSchema),
    defaultValues: {
      productId: product?.productId ?? 0,
      type: RetailStockEntryType.RESTOCK,
      quantity: 1,
      notes: "",
    },
  });
  const type = useWatch({ control, name: "type" });
  const isWriteOff = type === RetailStockEntryType.WRITE_OFF;

  const close = () => setRetailStockModalOpen(false, null);

  const onSubmit = async (data: RetailStockAdjustmentFormData) => {
    const res = await adjustRetailStockAction(data);
    if (!res.success) {
      toast.add({
        type: "error",
        priority: "high",
        title: res.fieldErrors?.notes?.[0] ?? res.error,
      });
      return;
    }
    toast.add({
      type: "success",
      title: isWriteOff
        ? `${data.quantity} written off`
        : `${data.quantity} added to stock`,
    });
    close();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        In stock now:{" "}
        <span className="font-semibold text-foreground">
          {product?.stockOnHand ?? 0}
        </span>
      </p>
      <FieldSet>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Adjustment</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      RETAIL_STOCK_ADJUSTMENT_OPTIONS.find(
                        (option) => option.value === value,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RETAIL_STOCK_ADJUSTMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.type?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Quantity</FieldLabel>
              <Input
                type="number"
                min={1}
                step={1}
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              <FieldError>{errors.quantity?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>
                {isWriteOff ? "Reason" : "Notes (optional)"}
              </FieldLabel>
              <Textarea
                {...field}
                rows={3}
                placeholder={
                  isWriteOff
                    ? "e.g. Cracked in storage"
                    : "e.g. Delivery from supplier"
                }
              />
              <FieldError>{errors.notes?.message}</FieldError>
            </Field>
          )}
        />
      </FieldSet>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={isWriteOff ? "destructive" : "default"}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : isWriteOff ? "Write Off" : "Add Stock"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RetailStockModal() {
  const {
    isRetailStockModalOpen,
    setRetailStockModalOpen,
    stockRetailProduct,
  } = useUIStore();

  if (!isRetailStockModalOpen) return null;

  return (
    <Modal
      isOpen
      onClose={() => setRetailStockModalOpen(false, null)}
      title={
        <>
          <Warehouse />
          Adjust Stock
        </>
      }
      description={`Restock or write off ${stockRetailProduct?.name ?? "this product"}. Every change is kept in the stock log.`}
    >
      <RetailStockModalContent />
    </Modal>
  );
}
