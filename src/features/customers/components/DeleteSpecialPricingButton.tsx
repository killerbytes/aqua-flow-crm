"use client";

import { deleteSpecialPricingAction } from "@/backend/actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { UserRole } from "@/lib/definitions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface DeleteSpecialPricingButtonProps {
  pricingId: number;
  productName?: string;
}

export function DeleteSpecialPricingButton({
  pricingId,
  productName,
}: DeleteSpecialPricingButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Resolves once the delete and refresh are done, so ConfirmDialog can close.
  const handleDelete = () =>
    new Promise<void>((resolve) =>
      startTransition(async () => {
        try {
          const res = await deleteSpecialPricingAction(pricingId);
          toast.add(
            res.success
              ? { type: "success", title: "Special discount removed" }
              : {
                  type: "error",
                  title: res.error || "Failed to remove special discount",
                },
          );
          router.refresh();
        } finally {
          resolve();
        }
      }),
    );

  return (
    <RoleGuard
      allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
    >
      <ConfirmDialog
        isLoading={isPending}
        onConfirm={handleDelete}
        title="Remove this special discount?"
        description={`New orders for ${productName || "this product"} will use the regular price. Existing orders keep the discount they were priced with.`}
        actionButtonText="Remove"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove special discount for ${productName || "product"}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </ConfirmDialog>
    </RoleGuard>
  );
}
