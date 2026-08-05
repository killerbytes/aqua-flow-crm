"use client";

import { updateOrderStatusAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/lib/definitions";
import { Loader2Icon } from "lucide-react";
import { useTransition } from "react";

export default function OrderActions({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = async (status: OrderStatus) => {
    startTransition(async () => {
      await updateOrderStatusAction(order.orderId, status);
    });
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
      {order.status === OrderStatus.DELIVERED && (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive">Cancel Order</Button>}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to cancel this order?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isPending}
                onClick={() => handleClick(OrderStatus.CANCELLED)}
              >
                {isPending && (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                )}
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
