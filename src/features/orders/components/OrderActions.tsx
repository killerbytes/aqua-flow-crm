"use client";

import { updateOrderStatusAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { Banknote, Check, Truck } from "lucide-react";
import { useTransition } from "react";

export default function OrderActions({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const { setPaymentModalOpen } = useUIStore();
  const handleClick = async (status: OrderStatus) => {
    startTransition(async () => {
      const res = await updateOrderStatusAction(order.orderId, status);
      if (!res.success) {
        return;
      }
    });
  };
  return (
    <div className="flex">
      <div>
        {order.status === OrderStatus.DELIVERED && (
          <ConfirmDialog
            isLoading={isPending}
            onConfirm={() => handleClick(OrderStatus.CANCELLED)}
            title="Are you sure you want to cancel this order?"
            description="This action cannot be undone."
            actionButtonText="Cancel Order"
          >
            <Button variant="destructive">Cancel Order</Button>
          </ConfirmDialog>
        )}
      </div>
      <div className="ml-auto flex gap-2">
        {order.paymentStatus !== PaymentStatus.PAID && (
          <Button onClick={() => setPaymentModalOpen(true, order)}>
            <Banknote /> Payment
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
            <Button className="bg-orange-500 hover:bg-orange-600">
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
            <Button className="bg-green-500 hover:bg-green-600">
              <Check className="w-4 h-4" /> Mark as Delivered
            </Button>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}
