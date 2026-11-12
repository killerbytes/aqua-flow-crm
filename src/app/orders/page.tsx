import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { checkPermission } from "@/backend/rbac/permissions";
import { OrderService } from "@/backend/services";
import { RoleGuard } from "@/components/auth/RoleGuard";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import { OrderFormModalButton } from "@/features/orders/components/OrderFormModalButton";
import OrderList from "@/features/orders/components/OrderList";
import OrderListFilter from "@/features/orders/components/OrderListFilter";
import { WalkInSalesModal } from "@/features/orders/components/WalkInSalesModal";
import { WalkInSalesModalButton } from "@/features/orders/components/WalkInSalesModalButton";
import {
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "@/lib/definitions";
import { parsePageParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { Paginated } from "@/types";
import {
  Ban,
  Clock,
  Plus,
  Receipt,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    customerId?: number;
    paymentStatus?: PaymentStatus;
    sort?: string;
    order?: "ASC" | "DESC";
  }>;
}

type Tone = "default" | "amber" | "violet" | "rose" | "muted";

const TONES: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  muted: "bg-muted text-muted-foreground",
};

// formatCurrency shows "N/A" for zero; a sales total of zero should read ₱0.00.
const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_ORDERS");
  const canSeeSales = checkPermission(user.role, "VIEW_DASHBOARD");
  const params = await searchParams;

  const { page, limit } = parsePageParams(params);
  const startDate = params?.startDate || "";
  const endDate = params?.endDate || "";
  const sort = params?.sort || "createdAt";
  const order = params?.order || "DESC";
  let orders: Paginated<any>;

  try {
    orders = await OrderService.getAll({
      limit,
      page,
      query: {
        status: params?.status,
        customerId: params?.customerId,
        startDate,
        endDate,
        paymentStatus: params?.paymentStatus,
      },
      sort,
      order,
    });
  } catch (err) {
    orders = {
      rows: [],
      pagination: { total: 0, totalPages: 0, currentPage: 0 },
    };
  }

  const summary = orders.summary ?? {};

  /**
   * The current URL with one filter toggled: picking the active tile again
   * clears it. The date range stays, and paging starts over.
   */
  const filterHref = (key: "status" | "paymentStatus", value: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && k !== "page") next.set(k, String(v));
    }
    if (params?.[key] === value) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    return query ? `?${query}` : "?";
  };

  const tiles: {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    tone: Tone;
    filter: { key: "status" | "paymentStatus"; value: string };
    /** Small print under the value. */
    hint?: string;
  }[] = [
    ...(canSeeSales
      ? [
          {
            label: summary.totalAmount?.label ?? "Delivered Sales",
            value: peso(Number(summary.totalAmount?.value || 0)),
            icon: <TrendingUp className="size-4" />,
            tone: "default" as Tone,
            filter: { key: "status" as const, value: OrderStatus.DELIVERED },
            // The total follows delivery dates while the list follows order
            // dates, so it can include orders placed before the range.
            hint:
              startDate || endDate
                ? "By delivery date in this range"
                : undefined,
          },
        ]
      : []),
    {
      label: "Pending",
      value: summary.pendingOrders?.value ?? 0,
      icon: <Clock className="size-4" />,
      tone: "amber",
      filter: { key: "status", value: OrderStatus.PENDING },
    },
    {
      label: "Out for Delivery",
      value: summary.deliveryOrders?.value ?? 0,
      icon: <Truck className="size-4" />,
      tone: "violet",
      filter: { key: "status", value: OrderStatus.OUT_FOR_DELIVERY },
    },
    {
      label: "Unpaid",
      value: summary.unpaidOrders?.value ?? 0,
      icon: <Receipt className="size-4" />,
      tone: "rose",
      filter: { key: "paymentStatus", value: PaymentStatus.UNPAID },
    },
    {
      label: "Cancelled",
      value: summary.cancelledOrders?.value ?? 0,
      icon: <Ban className="size-4" />,
      tone: "muted",
      filter: { key: "status", value: OrderStatus.CANCELLED },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <PageHeader>
            <ShoppingBag />
            Orders & Dispatch
          </PageHeader>
          <p className="text-sm text-muted-foreground">
            Refill orders, delivery status, and payments.
          </p>
        </div>
        <RoleGuard
          allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
        >
          <div className="flex flex-wrap items-center gap-2">
            <WalkInSalesModalButton variant="outline">
              <Store size={16} />
              Walk-In Sales
            </WalkInSalesModalButton>
            <OrderFormModalButton>
              <Plus size={16} />
              Create Order
            </OrderFormModalButton>
          </div>
        </RoleGuard>
      </div>

      {/* Each tile is also a quick filter for the list below. */}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3",
          tiles.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        {tiles.map((tile) => {
          const active = params?.[tile.filter.key] === tile.filter.value;
          return (
            <Link
              key={tile.label}
              href={filterHref(tile.filter.key, tile.filter.value)}
              aria-pressed={active}
              className={cn(
                "group rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40",
                active && "border-primary ring-1 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {tile.label}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    TONES[tile.tone],
                  )}
                >
                  {tile.icon}
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">
                {tile.value}
              </div>
              {tile.hint && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tile.hint}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <OrderListFilter />
          <OrderList orders={orders} />
        </CardContent>
      </Card>

      <OrderFormModal />
      <WalkInSalesModal />
    </div>
  );
}
