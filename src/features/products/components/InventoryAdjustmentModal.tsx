"use client";

import { createAdjustmentAction } from "@/backend/actions";
import {
  AdjustmentFormData,
  AdjustmentSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  INVENTORY_ADJUSTMENT_OPTIONS,
  InventoryAdjustmentType,
} from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

function InventoryAdjustmentModalContent() {
  const { setInventoryAdjustmentModalOpen, editingProduct } = useUIStore();
  const [, startTransition] = useTransition();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(AdjustmentSchema),
    values: {
      productId: editingProduct?.productId || 0,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 1,
      reason: "",
    },
  });

  const onSubmit = async (data: AdjustmentFormData) => {
    startTransition(async () => {
      try {
        const result = await createAdjustmentAction(data);
        if (!result.success) {
          return;
        }
        setInventoryAdjustmentModalOpen(false);
        reset();
      } catch (error) {}
    });
  };

  const handleClose = () => {
    setInventoryAdjustmentModalOpen(false);
    reset();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adjust Inventory</DialogTitle>
        <DialogDescription>
          Adjust the stock quantity for{" "}
          {editingProduct?.name || "the selected product"}.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldSet>
          <Field>
            <FieldLabel>Product</FieldLabel>
            <Input
              id="product"
              value={editingProduct?.name || "Loading..."}
              disabled
              className="cursor-not-allowed"
            />
          </Field>
        </FieldSet>
        <FieldSet>
          <Controller
            name="adjustmentType"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Adjustment Type</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="adjustmentType">
                    <SelectValue placeholder="Select adjustment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_ADJUSTMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.adjustmentType?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>
        <FieldSet>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  type="number"
                  {...field}
                  placeholder="Enter quantity"
                  min="1"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
                <FieldError>{errors.quantity?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>
        <FieldSet>
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Reason</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Add any notes about this adjustment..."
                  rows={3}
                />
                <FieldError>{errors.reason?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Save Adjustment</Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function InventoryAdjustmentModal() {
  const { isInventoryAdjustmentModalOpen, setInventoryAdjustmentModalOpen } =
    useUIStore();

  if (!isInventoryAdjustmentModalOpen) return null;

  return (
    <Modal
      isOpen={isInventoryAdjustmentModalOpen}
      onClose={() => setInventoryAdjustmentModalOpen(false, null)}
    >
      <InventoryAdjustmentModalContent />
    </Modal>
  );
}
