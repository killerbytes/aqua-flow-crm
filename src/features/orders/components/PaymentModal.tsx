"use client";

import { makePaymentAction } from "@/backend/actions";
import { PaymentFormData, PaymentSchema } from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { PaymentMethod } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export function PaymentModalContent({ onClose }: { onClose: () => void }) {
  const { isPaymentModalOpen, setPaymentModalOpen, editingOrder } =
    useUIStore();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      paymentMethod: PaymentMethod.CASH,
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  if (!editingOrder) return null;

  const onSubmit = (data: PaymentFormData) => {
    startTransition(async () => {
      try {
        const res = await makePaymentAction(editingOrder.orderId, data);
        if (!res.success) {
          throw new Error(res.error);
        }
        toast.add({
          type: "success",
          title: `Order #${editingOrder.orderId} marked as Paid`,
        });
        onClose();
        router.refresh();
      } catch (err: any) {
        toast.add({
          type: "error",
          priority: "high",
          title: err.message || "Failed to settle order payment",
        });
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-2 items-center">
          <Banknote className="w-5 h-5" />
          Settle Order
        </DialogTitle>
        <DialogDescription>Mark order as paid</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Payment Method</FieldLabel>
              <Select
                {...field}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.paymentMethod?.message}</FieldError>
            </Field>
          )}
        />

        <Controller
          name="paymentNotes"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Notes (optional)</FieldLabel>
              <Textarea {...field} />
              <FieldError>{errors.paymentNotes?.message}</FieldError>
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
            {isPending ? "Processing..." : "Mark as Paid"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function PaymentModal() {
  const { isPaymentModalOpen, setPaymentModalOpen } = useUIStore();

  if (!isPaymentModalOpen) return null;

  return (
    <Modal
      isOpen={isPaymentModalOpen}
      onClose={() => setPaymentModalOpen(false, null)}
    >
      <PaymentModalContent onClose={() => setPaymentModalOpen(false, null)} />
    </Modal>
  );
}
