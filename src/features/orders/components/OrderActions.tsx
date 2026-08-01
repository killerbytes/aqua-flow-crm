"use client";

import { updateOrderStatusAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/lib/definitions";

export default function OrderActions({ order }: { order: Order }) {
  const handleClick = async (status: OrderStatus) => {
    await updateOrderStatusAction(order.orderId, status);
  };
  return (
    <>
      {order.status === OrderStatus.PENDING && (
        <Button
          onClick={() => {
            handleClick(OrderStatus.OUT_FOR_DELIVERY);
          }}
        >
          Out For Delivery
        </Button>
      )}
      {order.status === OrderStatus.OUT_FOR_DELIVERY && (
        <Button
          onClick={() => {
            handleClick(OrderStatus.DELIVERED);
          }}
        >
          Mark as Delivered
        </Button>
      )}
    </>
  );
}
