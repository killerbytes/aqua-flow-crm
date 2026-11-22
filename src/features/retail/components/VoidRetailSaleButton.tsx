"use client";

import { voidRetailSaleAction } from "@/backend/actions";
import { ReasonDialog } from "@/components/ReasonDialog";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

/** Shown only to those who may void; the action checks VOID_RETAIL_SALE itself. */
export function VoidRetailSaleButton({ saleId }: { saleId: number }) {
  return (
    <ReasonDialog
      trigger={(open) => (
        <Button variant="outline" size="sm" onClick={open}>
          <Ban size={14} /> Void
        </Button>
      )}
      title={`Void retail sale #${saleId}?`}
      description="This can't be undone. Its units go back into stock, and it no longer counts as a sale or as money taken in."
      placeholder="Why is this sale being voided?"
      confirmLabel="Void Sale"
      successMessage={`Retail sale #${saleId} voided`}
      action={(reason) => voidRetailSaleAction(saleId, { reason })}
    />
  );
}
