import { ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { initDatabase } from "@/backend/db/database";
import { Order } from "@/backend/models";
import { OrderService } from "@/backend/services";
import { ColorBadge, CustomerName } from "@/components/presentation";
import PageHeader from "@/components/shared/PageHeader";
import OrderActions from "@/features/orders/components/OrderActions";
import OrderDetailList from "@/features/orders/components/OrderDetailList";
import { PaymentModal } from "@/features/orders/components/PaymentModal";
import {
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_METHOD_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
} from "@/lib/definitions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function OrderDetailsPage({
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
        <ArrowLeft className="w-4 h-4" />
        Back to Orders List
      </Link>
      <div className="md:flex justify-between items-center">
        <div>
          <PageHeader>
            <ShoppingBag />
            Order Details
          </PageHeader>
          <div className="text-muted-foreground">
            Viewing order details of{" "}
            <Link
              className="text-primary hover:underline hover:cursor-pointer"
              href={`/customers/${order.customer?.customerId}`}
            >
              <CustomerName customer={order.customer} />
            </Link>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
            {order.status}
          </ColorBadge>
          <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
            {order.paymentStatus}
          </ColorBadge>
          {order.paymentMethod && (
            <ColorBadge colorMap={PAYMENT_METHOD_BADGE_COLOR}>
              {order.paymentMethod}
            </ColorBadge>
          )}
          <div className="text-3xl text-primary font-bold ml-4">
            {formatCurrency(order.totalAmount)}
          </div>
        </div>
      </div>
      {order && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t space-y-2 text-sm">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
      <PaymentModal />
    </>
  );
}
