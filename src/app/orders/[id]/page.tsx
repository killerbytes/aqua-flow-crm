import { requirePagePermission } from "@/backend/auth/context";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

import { initDatabase } from "@/backend/db/database";
import { Order } from "@/backend/models";
import { OrderService } from "@/backend/services";
import { ColorBadge, CustomerName } from "@/components/presentation";
import PageHeader from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderActions from "@/features/orders/components/OrderActions";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import OrderDetailList from"@/features/orders/components/OrderDetailList";
import { OrderPaymentList } from "@/features/orders/components/OrderPaymentList";
import { PaymentModal } from "@/features/orders/components/PaymentModal";
import {
  ORDER_STATUS_BADGE_COLOR,
  OrderStatus,
  PAYMENT_METHOD_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
  PaymentStatus,
} from "@/lib/definitions";
import { fromCents, toCents } from "@/lib/money";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";

const STEPS = [
  { status: OrderStatus.PENDING, label: "Pending", icon: Clock },
  { status: OrderStatus.OUT_FOR_DELIVERY, label: "Out for delivery", icon: Truck },
  { status: OrderStatus.DELIVERED, label: "Delivered", icon: Check },
];

function StatusSteps({ status }: { status: OrderStatus }) {
  if (status === OrderStatus.CANCELLED) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        <Ban className="size-4" /> This order was cancelled
      </div>
    );
  }

  const current = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const Icon = step.icon;
        return (
          <li
            key={step.status}
            className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  i === current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px min-w-6 flex-1",
                  i < current ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_ORDERS");
  const { id } = await params;
  let order: Order | null = null;

  try {
    order = await OrderService.get(id);
  } catch (err) {
    console.log(err);
    order = null;
  }
  if (!order) redirect("/orders");

  const payments: any[] = (order as any).orderPayments ?? [];
  const deliveredBy = (order as any).deliveredByUser?.name;

  // Line totals, in centavos.
  const grossCents = order.orderDetails.reduce(
    (sum, d) => sum + toCents(d.unitPrice) * d.quantity,
    0,
  );
  const discountCents = order.orderDetails.reduce(
    (sum, d) => sum + toCents(d.discount || 0) * d.quantity,
    0,
  );
  const paidCents = payments
    .filter((p) => !p.reversedAt)
    .reduce((sum, p) => sum + toCents(p.amount), 0);
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const balance = fromCents(Math.max(0, toCents(order.totalAmount) - paidCents));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader>
          <ShoppingBag />
          Order #{order.orderId}
        </PageHeader>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Orders
        </Link>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
              <p className="text-sm text-muted-foreground">
                Placed {formatDateTime(order.createdAt)} for{" "}
                <Link
                  className="text-primary hover:underline"
                  href={`/customers/${order.customer?.customerId}`}
                >
                  <CustomerName customer={order.customer} />
                </Link>
              </p>
            </div>

            <div className="md:text-right">
              <div className="text-xs font-medium text-muted-foreground">
                Order Total
              </div>
              <div className="text-3xl font-bold tracking-tight tabular-nums text-primary">
                {formatCurrency(order.totalAmount)}
              </div>
              {order.status !== OrderStatus.CANCELLED && (
                <div
                  className={cn(
                    "mt-1 text-sm tabular-nums",
                    isPaid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {isPaid
                    ? "Paid in full"
                    : `${formatCurrency(balance)} balance due`}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="lg:max-w-lg lg:flex-1">
              <StatusSteps status={order.status} />
            </div>
            <OrderActions showPayment order={order} className="flex-wrap" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Items and payments */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4 text-primary" /> Items
              </CardTitle>
              <CardDescription>
                {order.orderDetails.length} product
                {order.orderDetails.length === 1 ? "" : "s"} on this order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderDetailList orderDetails={order.orderDetails} />
              <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(fromCents(grossCents))}
                  </dd>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Discounts</dt>
                    <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      −{formatCurrency(fromCents(discountCents))}
                    </dd>
                  </div>
                )}
                {order.surcharge > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Surcharge</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(order.surcharge)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t pt-1.5 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" /> Payments
              </CardTitle>
              <CardDescription>
                Payments taken directly on this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderPaymentList payments={payments} />
            </CardContent>
          </Card>
        </div>

        {/* Customer and order info */}
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={<User className="size-4" />} label="Name">
                <Link
                  className="text-primary hover:underline"
                  href={`/customers/${order.customer?.customerId}`}
                >
                  <CustomerName customer={order.customer} />
                </Link>
              </InfoRow>
              <InfoRow icon={<MapPin className="size-4" />} label="Address">
                {[order.customer?.address, order.customer?.barangay]
                  .filter(Boolean)
                  .join(", ") || (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </InfoRow>
              <InfoRow icon={<Phone className="size-4" />} label="Phone">
                {order.customer?.phone ? (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="hover:underline"
                  >
                    {order.customer.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </InfoRow>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> Order Info
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={<CalendarDays className="size-4" />} label="Order date">
                {formatDateTime(order.createdAt)}
              </InfoRow>
              <InfoRow icon={<User className="size-4" />} label="Taken by">
                {order.user?.name || (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </InfoRow>
              {order.deliveredAt && (
                <InfoRow icon={<Truck className="size-4" />} label="Delivered">
                  {formatDateTime(order.deliveredAt)}
                </InfoRow>
              )}
              {order.deliveredAt && (
                <InfoRow
                  icon={<UserCheck className="size-4" />}
                  label="Delivered by"
                >
                  {deliveredBy || (
                    <span className="text-muted-foreground">Not recorded</span>
                  )}
                </InfoRow>
              )}
              {order.paymentNotes && (
                <InfoRow
                  icon={<CreditCard className="size-4" />}
                  label="Payment notes"
                >
                  <span className="whitespace-pre-wrap">
                    {order.paymentNotes}
                  </span>
                </InfoRow>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentModal />
      <OrderFormModal />
    </div>
  );
}
