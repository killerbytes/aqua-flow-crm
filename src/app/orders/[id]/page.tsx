import { ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { initDatabase } from "@/backend/db/database";
import { Order } from "@/backend/models";
import { OrderService } from "@/backend/services";
import { ColorBadge } from "@/components/ui/presentation";
import OrderActions from "@/features/orders/components/OrderActions";
import OrderDetailList from "@/features/orders/components/OrderDetailList";
import {
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
} from "@/lib/definitions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await initDatabase();
  const { id } = await params;
  let order: Order | null = null;

  try {
    order = await OrderService.get(id);
  } catch (err) {
    console.log(err);

    order = null;
  }
  if (!order) redirect("/orders");

  return (
    <>
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Back to Orders
      </Link>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag />
            Order #{order.orderId}
          </h1>
          <p className="text-muted-foreground">
            Viewing order details for order ID: #{order.orderId}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
            {order.status}
          </ColorBadge>
          <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
            {order.paymentStatus}
          </ColorBadge>
          <div className="text-3xl text-primary font-bold">
            {formatCurrency(order.totalAmount)}
          </div>
        </div>
      </div>
      {order && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t space-y-2 text-sm">
          <div>
            <p>
              <strong>Name:</strong>{" "}
              <Link
                href={`/customers/${order.customer?.customerId}`}
                className="text-primary hover:underline"
              >
                {order.customer?.name}
              </Link>
            </p>
            <p>
              <strong>Address:</strong> {order.customer?.address}
            </p>
            <p>
              <strong>Barangay:</strong> {order.customer?.barangay}
            </p>
            <p>
              <strong>Phone:</strong> {order.customer?.phone}
            </p>
          </div>
          <div>
            <p>
              <strong>Order Date:</strong> {formatDateTime(order.createdAt)}
            </p>
            <p>
              <strong>User:</strong> {order.user.name}
            </p>
          </div>
        </div>
      )}

      <OrderDetailList orderDetails={order.orderDetails} />
      <OrderActions order={order} />
    </>
  );
}
