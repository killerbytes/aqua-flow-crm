"use client";

import { reversePaymentAction } from "@/backend/actions/invoice.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { UserRole } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ReversePaymentButton({
  paymentId,
  amount,
}: {
  paymentId: number;
  amount: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setIsOpen(false);
    setReason("");
    setReasonError(undefined);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await reversePaymentAction(paymentId, { reason });
      if (!res.success) {
        const fieldError = res.fieldErrors?.reason?.[0];
        if (fieldError) {
          setReasonError(fieldError);
        } else {
          toast.add({ type: "error", description: res.error });
        }
        return;
      }

      toast.add({ type: "success", description: "Payment reversed" });
      close();
      router.refresh();
    });
  };

  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <Undo2 size={14} /> Reverse
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={`Reverse this ${formatCurrency(amount)} payment?`}
        description="This can't be undone. The payment stays on record, marked as reversed, and the invoice balance goes back up."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this payment being reversed?"
            />
            <FieldError>{reasonError}</FieldError>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              Reverse Payment
            </Button>
          </DialogFooter>
        </form>
      </Modal>
    </RoleGuard>
  );
}
