"use client";

import { voidInvoiceAction } from "@/backend/actions/invoice.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ReasonDialog } from "@/components/ReasonDialog";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/definitions";
import { Ban } from "lucide-react";

export function VoidInvoiceButton({ invoiceId }: { invoiceId: number }) {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <ReasonDialog
        trigger={(open) => (
          <Button variant="outline" onClick={open}>
            <Ban size={16} /> Void Invoice
          </Button>
        )}
        title="Void this invoice?"
        description="This can't be undone. Its orders go back to being unpaid and can be invoiced again."
        placeholder="Why is this invoice being voided?"
        confirmLabel="Void Invoice"
        successMessage="Invoice voided"
        action={(reason) => voidInvoiceAction(invoiceId, { reason })}
      />
    </RoleGuard>
  );
}
