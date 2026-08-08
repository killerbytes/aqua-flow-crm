import { initDatabase } from "@/backend/db/database";
import { OrderService } from "@/backend/services";
import { OrderFormModalButton } from "@/components/ActionButtons";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import OrderList from "@/features/orders/components/OrderList";
import OrderListFilter from "@/features/orders/components/OrderListFilter";
import { PAGINATION, PaymentStatus } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { Paginated } from "@/types";
import { Plus, ShoppingBag } from "lucide-react";

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
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await initDatabase();
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const startDate = params?.startDate || "";
  const endDate = params?.endDate || "";
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
    });
  } catch (err) {
    orders = {
      rows: [],
      pagination: { total: 0, totalPages: 0, currentPage: 0 },
    };
  }

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
        <OrderFormModalButton>
          <Plus />
          Create Order
        </OrderFormModalButton>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>
              {orders.summary.totalAmount?.label}
            </CardDescription>
            <CardTitle>
              {formatCurrency(Number(orders.summary.totalAmount?.value || 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        {orders.summary.unpaidOrders?.value > 0 && (
          <Card>
            <CardHeader>
              <CardDescription>
                {orders.summary.unpaidOrders?.label}
              </CardDescription>
              <CardTitle>{orders.summary.unpaidOrders?.value}</CardTitle>
            </CardHeader>
          </Card>
        )}
        {orders.summary.pendingOrders?.value > 0 && (
          <Card>
            <CardHeader>
              <CardDescription>
                {orders.summary.pendingOrders?.label}
              </CardDescription>
              <CardTitle>{orders.summary.pendingOrders?.value}</CardTitle>
            </CardHeader>
          </Card>
        )}
        {orders.summary.deliveryOrders?.value > 0 && (
          <Card>
            <CardHeader>
              <CardDescription>
                {orders.summary.deliveryOrders?.label}
              </CardDescription>
              <CardTitle>{orders.summary.deliveryOrders?.value}</CardTitle>
            </CardHeader>
          </Card>
        )}
        {orders.summary.cancelledOrders?.value > 0 && (
          <Card>
            <CardHeader>
              <CardDescription className="text-red-500">
                {orders.summary.cancelledOrders?.label}
              </CardDescription>
              <CardTitle>{orders.summary.cancelledOrders?.value}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
      <div className="space-y-2">
        <OrderListFilter />
        <OrderList orders={orders} />
      </div>

      <OrderFormModal />
    </div>
  );
}
