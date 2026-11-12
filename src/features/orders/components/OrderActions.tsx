"use client";

import { updateOrderStatusAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import { RoleGuard } from "@/components/auth/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus, UserRole } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Banknote, Check, Pencil, RotateCcw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface OrderActionsProps {
  order: Order;
  size?: "default" | "sm";
  className?: string;
  showPayment?: boolean;
  /**
   * "list" shows only the delivery steps (Out For Delivery, Mark as
   * Delivered). Cancel, Back to Pending, and Payment stay on the details page.
   */
  variant?: "list" | "detail";
}

export default function OrderActions({
  order,
  size = "default",
  className,
  showPayment = false,
  variant = "detail",
}: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setPaymentModalOpen, setOrderFormModalOpen } = useUIStore();
  const isDetail = variant === "detail";
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
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
        <div>
          {isDetail && order.status === OrderStatus.DELIVERED && (
            <ConfirmDialog
              isLoading={isPending}
              onConfirm={() => handleClick(OrderStatus.CANCELLED)}
              title="Are you sure you want to cancel this order?"
              description="This action cannot be undone."
              actionButtonText="Cancel Order"
            >
              <Button variant="destructive" size={size}>
                Cancel Order
              </Button>
            </ConfirmDialog>
          )}
        </div>
      </RoleGuard>

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
            {isDetail && showPayment && order.paymentStatus !== PaymentStatus.PAID &&
              order.status !== OrderStatus.CANCELLED && (
                <Button
                  size={size}
                  onClick={() => setPaymentModalOpen(true, order)}
                >
                  <Banknote className="w-4 h-4" /> Payment
                </Button>
              )}
            {isDetail &&
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
            <>
              {isDetail && (
                <ConfirmDialog
                  isLoading={isPending}
                  onConfirm={() => handleClick(OrderStatus.PENDING)}
                  title="Return order to pending?"
                  description=""
                  actionButtonText="Back to Pending"
                >
                  <Button size={size} variant="outline">
                    <RotateCcw className="w-4 h-4" /> Back to Pending
                  </Button>
                </ConfirmDialog>
              )}
              <ConfirmDialog
                isLoading={isPending}
                onConfirm={() => handleClick(OrderStatus.DELIVERED)}
                title="Mark order as delivered?"
                description=""
                actionButtonText="Mark as Delivered"
              >
                <Button
                  size={size}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="w-4 h-4" /> Mark as Delivered
                </Button>
              </ConfirmDialog>
            </>
          )}
        </div>
      </RoleGuard>
    </div>
  );
}
