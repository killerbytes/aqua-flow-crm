"use client";

import { voidOrderAction } from "@/backend/actions";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Asks for the reason and voids the order. Whoever opens it decides who may:
 * the server checks the role and the order's state itself.
 */
export function VoidOrderDialog({
  orderId,
  isPaid,
  isOpen,
  onClose,
}: {
  orderId: number;
  /** A paid order has its payment reversed when it is voided. */
  isPaid: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const close = () => {
    onClose();
    setReason("");
    setReasonError(undefined);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await voidOrderAction(orderId, { reason });
      if (!res.success) {
        const fieldError = res.fieldErrors?.reason?.[0];
        if (fieldError) {
          setReasonError(fieldError);
        } else {
          toast.add({ type: "error", description: res.error });
          // Refused because the order changed, so show it as it is now.
          close();
          router.refresh();
        }
        return;
      }

      toast.add({ type: "success", description: `Order #${orderId} voided` });
      close();
      router.refresh();
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Void this order?"
      description={
        isPaid
          ? "This can't be undone. The order is cancelled and its payment is reversed."
          : "This can't be undone. The order is cancelled."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel>Reason</FieldLabel>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this order being voided?"
          />
          <FieldError>{reasonError}</FieldError>
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={isPending}>
            Void Order
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}
