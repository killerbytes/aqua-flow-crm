"use client";

import { voidOrderAction } from "@/backend/actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { UserRole } from "@/lib/definitions";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function VoidOrderButton({
  orderId,
  isPaid,
  size = "default",
}: {
  orderId: number;
  /** A paid order has its payment reversed when it is voided. */
  isPaid: boolean;
  size?: "default" | "sm";
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
      const res = await voidOrderAction(orderId, { reason });
      if (!res.success) {
        const fieldError = res.fieldErrors?.reason?.[0];
        if (fieldError) {
          setReasonError(fieldError);
        } else {
          toast.add({ type: "error", description: res.error });
        }
        return;
      }

      toast.add({ type: "success", description: `Order #${orderId} voided` });
      close();
      router.refresh();
    });
  };

  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <Button variant="destructive" size={size} onClick={() => setIsOpen(true)}>
        <Ban className="w-4 h-4" /> Void Order
      </Button>

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
    </RoleGuard>
  );
}
