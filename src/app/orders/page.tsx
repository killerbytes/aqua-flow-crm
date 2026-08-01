import { initDatabase } from "@/backend/db/database";
import { OrderService } from "@/backend/services";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import OrderList from "@/features/orders/components/OrderList";
import { OrderListActions } from "@/features/orders/components/OrderListActions";
import OrderListFilter from "@/features/orders/components/OrderListFilter";
import { OrderStatus, PAGINATION } from "@/lib/definitions";
import { CheckCircle2, Clock, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await initDatabase();
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const startDate = params?.startDate || "";
  const endDate = params?.endDate || "";
  let orders: { rows: any[]; pagination: any };

  try {
    orders = await OrderService.getAll({
      limit,
      page,
      query: {
        startDate,
        endDate,
      },
    });
  } catch (err) {
    orders = { rows: [], pagination: { total: 0, currentPage: 0 } };
  }
  const deliveredCount = orders.rows.filter(
    (o) => o.status === OrderStatus.DELIVERED,
  ).length;
  const pendingCount = orders.rows.filter(
    (o) => o.status === OrderStatus.PENDING,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag />
            Order Transactions & Dispatch
          </h1>
          <p className="text-muted-foreground">
            Water refill orders, status tracking, payment verification, and line
            items.
          </p>
        </div>
        <OrderListActions />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered: {deliveredCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending: {pendingCount}</span>
          </div>
        </div>
      </div>

      <OrderListFilter />
      <OrderList orders={orders} />

      <OrderFormModal />
    </div>
  );
}
