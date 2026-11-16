"use client";

import { updateOrderStatusAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import { hasRole, RoleGuard } from "@/components/auth/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus, UserRole } from "@/lib/definitions";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import {
  Ban,
  Banknote,
  Check,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { VoidOrderDialog } from "./VoidOrderDialog";

interface OrderActionsProps {
  order: Order;
  size?: "default" | "sm";
  className?: string;
  showPayment?: boolean;
  /**
   * The order is on an active invoice, so it can't be paid directly, edited, or
   * voided. Those buttons are hidden, as the server would refuse them.
   */
  isInvoiced?: boolean;
  /**
   * "list" shows only the delivery steps (Out For Delivery, Mark as
   * Delivered). Payment, Edit, and the More menu (Back to Pending, Void Order)
   * stay on the details page.
   */
  variant?: "list" | "detail";
}

export default function OrderActions({
  order,
  size = "default",
  className,
  showPayment = false,
  isInvoiced = false,
  variant = "detail",
}: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setPaymentModalOpen, setOrderFormModalOpen } = useUIStore();
  const isDetail = variant === "detail";
  // Void, Payment, and Edit: details page only, and never for an invoiced order.
  const canChangeOrder = isDetail && !isInvoiced;

  // The More menu holds the rare actions. It is hidden when it would be empty,
  // so who sees each item is worked out here; the server checks again.
  const role = useAuthStore((state) => state.user?.role);
  const [isVoidOpen, setVoidOpen] = useState(false);
  const [isReturnOpen, setReturnOpen] = useState(false);
  const isPendingUnpaid =
    order.status === OrderStatus.PENDING &&
    order.paymentStatus === PaymentStatus.UNPAID;
  // A Cashier may only void an order that is still pending and unpaid.
  const canVoid =
    canChangeOrder &&
    order.status !== OrderStatus.CANCELLED &&
    hasRole(role, [
      UserRole.ADMIN,
      UserRole.MANAGER,
      ...(isPendingUnpaid ? [UserRole.CASHIER] : []),
    ]);
  const canReturnToPending =
    isDetail && order.status === OrderStatus.OUT_FOR_DELIVERY;

  // Resolves once the update and refresh are done, so ConfirmDialog can close.
  const handleClick = (status: OrderStatus) =>
    new Promise<void>((resolve) =>
      startTransition(async () => {
        try {
          await updateStatus(status);
        } finally {
          resolve();
        }
      }),
    );

  const updateStatus = async (status: OrderStatus) => {
    const res = await updateOrderStatusAction(order.orderId, status);
    if (!res.success) {
      toast.add({
        type: "error",
        title: res.error || "Failed to update order status",
      });
      // A refusal usually means someone else changed the order, so show it as
      // it is now.
      router.refresh();
      return;
    }
    toast.add({
      type: "success",
      title: `Order #${order.orderId} status updated to ${status}`,
    });
    router.refresh();
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <RoleGuard
        allowedRoles={[
          UserRole.ADMIN,
          UserRole.MANAGER,
          UserRole.CASHIER,
          UserRole.DELIVERY,
        ]}
      >
        <div className="ml-auto flex items-center gap-2">
          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
          >
            {canChangeOrder && showPayment && order.paymentStatus !== PaymentStatus.PAID &&
              order.status !== OrderStatus.CANCELLED && (
                <Button
                  size={size}
                  onClick={() => setPaymentModalOpen(true, order)}
                >
                  <Banknote className="w-4 h-4" /> Payment
                </Button>
              )}
            {canChangeOrder &&
              order.status === OrderStatus.PENDING &&
              order.paymentStatus !== PaymentStatus.PAID && (
                <Button
                  size={size}
                  variant="outline"
                  onClick={() => setOrderFormModalOpen(true, null, order)}
                >
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
              )}
          </RoleGuard>
          {order.status === OrderStatus.PENDING && (
            <ConfirmDialog
              isLoading={isPending}
              onConfirm={() => handleClick(OrderStatus.OUT_FOR_DELIVERY)}
              title="Mark order as out for delivery?"
              description=""
              actionButtonText="Out For Delivery"
            >
              <Button
                size={size}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Truck className="w-4 h-4" /> Out For Delivery
              </Button>
            </ConfirmDialog>
          )}
          {order.status === OrderStatus.OUT_FOR_DELIVERY && (
            <ConfirmDialog
              isLoading={isPending}
              onConfirm={() => handleClick(OrderStatus.DELIVERED)}
              title="Mark order as delivered?"
              description=""
              actionButtonText="Mark as Delivered"
            >
              <Button size={size} className="bg-green-500 hover:bg-green-600">
                <Check className="w-4 h-4" /> Mark as Delivered
              </Button>
            </ConfirmDialog>
          )}
          {(canReturnToPending || canVoid) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size={size === "sm" ? "icon-sm" : "icon"}
                    variant="outline"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-auto min-w-44">
                {canReturnToPending && (
                  <DropdownMenuItem onClick={() => setReturnOpen(true)}>
                    <RotateCcw /> Back to Pending
                  </DropdownMenuItem>
                )}
                {canReturnToPending && canVoid && <DropdownMenuSeparator />}
                {canVoid && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setVoidOpen(true)}
                  >
                    <Ban /> Void Order
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Outside the menu, so they stay open after it closes. */}
        <ConfirmDialog
          open={isReturnOpen}
          onOpenChange={setReturnOpen}
          isLoading={isPending}
          onConfirm={() => handleClick(OrderStatus.PENDING)}
          title="Return order to pending?"
          description=""
          actionButtonText="Back to Pending"
        />
        <VoidOrderDialog
          orderId={order.orderId}
          isPaid={order.paymentStatus === PaymentStatus.PAID}
          isOpen={isVoidOpen}
          onClose={() => setVoidOpen(false)}
        />
      </RoleGuard>
    </div>
  );
}
