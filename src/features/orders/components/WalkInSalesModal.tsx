"use client";

import { createOrderAction, getWalkInCustomerAction } from "@/backend/actions";
import { OrderFormData, OrderSchema } from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  OrderItemsField,
  orderTotal,
  UNSET_ORDER_ITEM,
  useOrderProducts,
} from "./OrderItemsField";

const WalkInSalesModalContent = () => {
  const router = useRouter();
  const setWalkInModalOpen = useUIStore((state) => state.setWalkInModalOpen);
  const [isPending, startTransition] = useTransition();
  const [walkInCustomerId, setWalkInCustomerId] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(OrderSchema),
    defaultValues: {
      customerId: 0,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      createdAt: new Date().toISOString().split("T")[0],
      items: [UNSET_ORDER_ITEM],
    },
  });
  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;
  const products = useOrderProducts(form);
  const items = useWatch({ control, name: "items" });

  useEffect(() => {
    let cancelled = false;
    getWalkInCustomerAction().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setWalkInCustomerId(res.data.customerId);
      setValue("customerId", res.data.customerId);
    });
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const onSubmit = async (data: OrderFormData) => {
    if (!walkInCustomerId) {
      toast.add({
        type: "error",
        title: "Walk-in customer account not loaded yet",
      });
      return;
    }

    startTransition(async () => {
      try {
        const payload: OrderFormData = {
          ...data,
          customerId: walkInCustomerId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
        };

        const res = await createOrderAction(payload);
        if (!res.success) {
          throw new Error(res.error);
        }

        toast.add({
          type: "success",
          title: "Consolidated Walk-In sales recorded successfully",
        });

        setWalkInModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.add({
          type: "error",
          priority: "high",
          title: err.message || "Failed to record walk-in sales",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <Controller
        name="createdAt"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel className="flex items-center gap-1">
              <Calendar size={14} /> Sale Date
            </FieldLabel>
            <Input
              type="date"
              value={
                field.value
                  ? new Date(field.value).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => field.onChange(e.target.value)}
            />
            <FieldError>{errors.createdAt?.message}</FieldError>
          </Field>
        )}
      />

      <OrderItemsField form={form} products={products} />

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs text-muted-foreground font-medium">
          Total Daily Revenue:
        </span>
        <span className="text-2xl font-bold text-green-500">
          {formatCurrency(orderTotal(items))}
        </span>
      </div>

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
          {isPending ? "Recording..." : "Record Daily Walk-In Sales"}
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
          Consolidated Daily Walk-In Sales
        </>
      }
      description="Record over-the-counter daily cash sales for walk-in customers."
      isOpen={isWalkInModalOpen}
      onClose={() => setWalkInModalOpen(false)}
    >
      <WalkInSalesModalContent />
    </Modal>
  );
};
