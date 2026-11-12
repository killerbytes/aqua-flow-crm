"use client";

import type { ActionResponse } from "@/backend/lib/safe-action";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ReasonDialogProps {
  /** The button that opens the dialog. Call `open` from its click handler. */
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  successMessage: string;
  /** Runs the action with the reason typed in. */
  action: (reason: string) => Promise<ActionResponse<unknown>>;
}

/**
 * Confirmation dialog for an action that can't be undone and must record why,
 * such as voiding an invoice or reversing a payment.
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  placeholder,
  confirmLabel,
  successMessage,
  action,
}: ReasonDialogProps) {
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
      const res = await action(reason);
      if (!res.success) {
        const fieldError = res.fieldErrors?.reason?.[0];
        if (fieldError) {
          setReasonError(fieldError);
        } else {
          toast.add({ type: "error", description: res.error });
        }
        return;
      }

      toast.add({ type: "success", description: successMessage });
      close();
      router.refresh();
    });
  };

  return (
    <>
      {trigger(() => setIsOpen(true))}

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={title}
        description={description}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={placeholder}
            />
            <FieldError>{reasonError}</FieldError>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </Modal>
    </>
  );
}
