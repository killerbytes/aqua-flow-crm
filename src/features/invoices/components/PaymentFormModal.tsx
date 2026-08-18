"use client";

import { makeInvoicePaymentAction } from "@/backend/actions/invoice.actions";
import {
  InvoicePaymentFormData,
  InvoicePaymentSchema,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { PaymentMethod } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

interface PaymentFormModalProps {
  onClose: () => void;
}

function PaymentFormModalContent({ onClose }: PaymentFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { editingInvoice } = useUIStore();

  const form = useForm({
    resolver: zodResolver(InvoicePaymentSchema),
    defaultValues: {
      invoiceId: Number(editingInvoice?.invoiceId),
      paymentAmount: Number(editingInvoice?.amount),
      paymentMethod: PaymentMethod.CASH,
      paymentNotes: "",
      paymentDate: new Date(),
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const handleSave = (data: InvoicePaymentFormData) => {
    startTransition(async () => {
      try {
        const res = await makeInvoicePaymentAction(data);
        if (!res.success) {
          throw new Error(res.error);
        }

        toast.add({
          type: "success",
          description: "Payment logged successfully",
        });
        onClose();
        router.refresh();
      } catch (error: any) {
        toast.add({
          type: "error",
          priority: "high",
          description: error.message || "Failed to log payment",
        });
      }
    });
  };

  const watchPaymentAmount = useWatch({
    control,
    name: "paymentAmount",
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3">Pay Invoice </DialogTitle>
        <DialogDescription>
          Pay Invoice for{" "}
          <span className="font-bold text-accent-foreground">
            {editingInvoice?.customer.name}
          </span>
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <Controller
          name="paymentAmount"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Payment Amount</FieldLabel>
              <Input
                type="number"
                placeholder="0"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
              <FieldError>{errors.paymentAmount?.message}</FieldError>
            </Field>
          )}
        />

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
              <FieldLabel>Payment Notes</FieldLabel>
              <Textarea
                {...field}
                onChange={(e) => field.onChange(e.target.value)}
              />
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
            {isPending
              ? "Logging..."
              : watchPaymentAmount < Number(editingInvoice?.amount)
                ? "Pay Partial"
                : "Pay In Full"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function PaymentFormModal() {
  const { isPaymentFormModalOpen, setPaymentFormModalOpen } = useUIStore();

  if (!isPaymentFormModalOpen) return null;

  return (
    <Modal
      isOpen={isPaymentFormModalOpen}
      onClose={() => setPaymentFormModalOpen(false, null)}
    >
      <PaymentFormModalContent
        onClose={() => setPaymentFormModalOpen(false, null)}
      />
    </Modal>
  );
}
