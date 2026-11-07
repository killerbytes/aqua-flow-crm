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
import { Banknote, Check, RotateCcw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface OrderActionsProps {
  order: Order;
  size?: "default" | "sm";
  className?: string;
  showPayment?: boolean
}

export default function OrderActions({
  order,
  size = "default",
  className,
  showPayment = false

}: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setPaymentModalOpen } = useUIStore();
  const handleClick = async (status: OrderStatus) => {
    startTransition(async () => {
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
    });
  };
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
        <div>
          {order.status === OrderStatus.DELIVERED && (
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
        allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
      >
        <div className="ml-auto flex items-center gap-2">
          {showPayment && order.paymentStatus !== PaymentStatus.PAID &&
            order.status !== OrderStatus.CANCELLED && (
              <Button
                size={size}
                onClick={() => setPaymentModalOpen(true, order)}
              >
                <Banknote className="w-4 h-4" /> Payment
              </Button>
            )}
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
