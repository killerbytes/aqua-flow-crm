"use client";

import { setSpecialPricingAction } from "@/backend/actions";
import { ProductInventory } from "@/backend/models";
import {
  SpecialPricingFormData,
  SpecialPricingSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

interface SpecialPricingModalProps {
  onClose: () => void;
  products: ProductInventory[];
}

function SpecialPricingModalContent({
  onClose,
  products,
}: SpecialPricingModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isTemp, setIsTemp] = React.useState(false);
  const { editingCustomer, setEquipmentLogModalOpen } = useUIStore();

  const form = useForm<SpecialPricingFormData>({
    resolver: zodResolver(SpecialPricingSchema),
    defaultValues: {
      customerId: Number(editingCustomer?.customerId),
      productId: 0,
      discountAmount: 5,
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const handleSave = (data: SpecialPricingFormData) => {
    startTransition(async () => {
      try {
        const res = await setSpecialPricingAction(data);
        if (!res.success) {
          throw new Error(res.error);
        }

        toast.add({
          type: "success",
          description: "Special pricing set successfully",
        });
        onClose();
        router.refresh();
      } catch (error: any) {
        toast.add({
          type: "error",
          priority: "high",
          description: error.message || "Failed to set special pricing",
        });
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3 font-semibold text-primary">
          Special Pricing
        </DialogTitle>
        <DialogDescription>
          Set special pricing for{" "}
          <span className="font-bold text-accent-foreground">
            {editingCustomer?.name}
          </span>
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <Controller
          name="productId"
          control={control}
          rules={{ required: "Product is required" }}
          render={({ field }) => (
            <Field>
              <FieldLabel>Equipment / Product</FieldLabel>
              <Select
                {...field}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product...">
                    {(val) =>
                      products.find(
                        (p: ProductInventory) =>
                          String(p.productId) === String(val),
                      )?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p: ProductInventory) => !p.isLendOnly)
                    .map((p: ProductInventory) => (
                      <SelectItem key={p.productId} value={Number(p.productId)}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.productId?.message}</FieldError>
            </Field>
          )}
        />

        <Controller
          name="discountAmount"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Discount Amount</FieldLabel>
              <Input
                type="number"
                placeholder="0"
                step="5"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              <FieldError>{errors.discountAmount?.message}</FieldError>
            </Field>
          )}
        />

        <DialogFooter className="pt-4">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
            )}
            {isPending ? "Logging..." : "Save Record"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function SpecialPricingModal({
  products,
}: {
  products: ProductInventory[];
}) {
  const { isSpecialPricingModalOpen, setSpecialPricingModalOpen } =
    useUIStore();

  if (!isSpecialPricingModalOpen) return null;

  return (
    <Modal
      isOpen={isSpecialPricingModalOpen}
      onClose={() => setSpecialPricingModalOpen(false, null)}
    >
      <SpecialPricingModalContent
        onClose={() => setSpecialPricingModalOpen(false, null)}
        products={products}
      />
    </Modal>
  );
}
