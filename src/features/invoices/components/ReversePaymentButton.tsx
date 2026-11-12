"use client";

import { reversePaymentAction } from "@/backend/actions/invoice.actions";
import { reverseOrderPaymentAction } from "@/backend/actions/order.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ReasonDialog } from "@/components/ReasonDialog";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { Undo2 } from "lucide-react";

export function ReversePaymentButton({
  paymentId,
  amount,
  kind = "invoice",
}: {
  paymentId: number;
  amount: number;
  kind?: "invoice" | "order";
}) {
  const reverse =
    kind === "order" ? reverseOrderPaymentAction : reversePaymentAction;

  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <ReasonDialog
        trigger={(open) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              open();
            }}
          >
            <Undo2 size={14} /> Reverse
          </Button>
        )}
        title={`Reverse this ${formatCurrency(amount)} payment?`}
        description={
          kind === "order"
            ? "This can't be undone. The payment stays on record, marked as reversed, and the order goes back to unpaid."
            : "This can't be undone. The payment stays on record, marked as reversed, and the invoice balance goes back up."
        }
        placeholder="Why is this payment being reversed?"
        confirmLabel="Reverse Payment"
        successMessage="Payment reversed"
        action={(reason) => reverse(paymentId, { reason })}
      />
    </RoleGuard>
  );
}
