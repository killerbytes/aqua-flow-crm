import { requirePagePermission } from "@/backend/auth/context";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  ClockAlert,
  DollarSign,
  Edit,
  MapPin,
  Package,
  Phone,
  Receipt,
  ShoppingBag,
  StickyNote,
  Tag,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";

import { initDatabase } from "@/backend/db/database";
import {
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
} from "@/backend/models";
import {
  CustomerService,
  EquipmentService,
  OrderService,
  ProductService,
} from "@/backend/services";
import { CommonService } from "@/backend/services/commonService";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ColorBadge } from "@/components/presentation";
import PageHeader from "@/components/shared/PageHeader";
import TabWrapper from "@/components/TabWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import { CustomerFormModalButton } from "@/features/customers/components/CustomerFormModalButton";
import { LogEquipmentModal } from "@/features/customers/components/LogEquipmentModal";
import { LogEquipmentModalButton } from "@/features/customers/components/LogEquipmentModalButton";
import { SpecialPricingModal } from "@/features/customers/components/SpecialPricingModal";
import { SpecialPricingModalButton } from "@/features/customers/components/SpecialPricingModalButton";
import { InvoiceFormModal } from "@/features/invoices/components/InvoiceFormModal";
import { InvoiceFormModalButton } from "@/features/invoices/components/InvoiceFormModalButton";
import { OrderFormModal } from "@/features/orders/components/OrderFormModal";
import { OrderFormModalButton } from "@/features/orders/components/OrderFormModalButton";
import OrderList from "@/features/orders/components/OrderList";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { CUSTOMER_STATUS_BADGE_COLOR, UserRole } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    limit?: number;
    page?: number;
    sort?: string;
    order?: "ASC" | "DESC";
  }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_CUSTOMERS");
  const { id } = await params;
  const { limit, page, sort, order } = await searchParams;
  let customer;

  try {
    customer = await CustomerService.get(id);
  } catch (err) {
    console.log(err);
    customer = null;
  }
  if (!customer || !customer.customerId) redirect("/customers");

  const products = await ProductService.getAll();
  const logsPromise = EquipmentService.getAll({
    limit,
    page,
    sort,
    order,
    query: {
      customerId: Number(id),
    },
  });
  const orders = await OrderService.getAll({
    limit,
    page,
    sort,
    order,
    query: {
      customerId: Number(id),
    },
  });
  const barangays = CommonService.getBarangays();

  const activeRegularBalances: CustomerEquipmentBalance[] =
    customer.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityOwed ?? 0) > 0,
    ) || [];

  const activeTemporaryBalances: CustomerEquipmentBalance[] =
    customer.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityTemporaryOwed ?? 0) > 0,
    ) || [];

  const specialPricings: CustomerSpecialPricing[] =
    customer.specialPricings || [];
  const unitsOut = activeRegularBalances.reduce(
    (sum, b) => sum + (b.quantityOwed ?? 0),
    0,
  );
  const unpaidOrders = Number(orders.summary?.unpaidOrders?.value || 0);
  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string) => word[0]?.toUpperCase())
    .join("");
  const customerSince = new Date(customer.createdAt).toLocaleDateString(
    "en-PH",
    { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" },
  );

  const stats = [
    {
      label: "Delivered Sales",
      value: formatCurrency(Number(orders.summary?.totalAmount?.value || 0)),
      icon: <TrendingUp className="size-4" />,
      warning: false,
    },
    {
      label: "Orders",
      value: orders.pagination.total,
      icon: <ShoppingBag className="size-4" />,
      warning: false,
    },
    {
      label: "Unpaid Orders",
      value: unpaidOrders,
      icon: <Receipt className="size-4" />,
      warning: unpaidOrders > 0,
    },
    {
      label: "Containers Out",
      value: unitsOut,
      icon: <Package className="size-4" />,
      warning: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader>
          <User />
          Customer Profile
        </PageHeader>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Customers
        </Link>
      </div>

      {/* Profile */}
      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {initials || <User />}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-bold tracking-tight">
                  {customer.name}
                </h2>
                <ColorBadge colorMap={CUSTOMER_STATUS_BADGE_COLOR}>
                  {customer.status}
                </ColorBadge>
              </div>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  {[customer.address, customer.barangay]
                    .filter(Boolean)
                    .join(", ") || "No address"}
                </span>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="size-4 shrink-0" />
                    {customer.phone}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-4 shrink-0" />
                    No phone
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0" />
                  Customer since {customerSince}
                </span>
              </div>
            </div>
          </div>

          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
          >
            <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
              <OrderFormModalButton customer={customer}>
                <ShoppingBag className="size-4" />
                Create Order
              </OrderFormModalButton>
              <InvoiceFormModalButton customer={customer} variant="outline">
                <DollarSign className="size-4" />
                Create Invoice
              </InvoiceFormModalButton>
              <LogEquipmentModalButton
                customerId={customer.customerId}
                variant="outline"
              >
                <ArrowRightLeft className="size-4" />
                Log Equipment
              </LogEquipmentModalButton>
              <SpecialPricingModalButton customer={customer} variant="outline">
                <Tag className="size-4 text-orange-500" />
                Special Discount
              </SpecialPricingModalButton>
              <CustomerFormModalButton customer={customer} variant="ghost">
                <Edit className="size-4" />
                Edit
              </CustomerFormModalButton>
            </div>
          </RoleGuard>
        </CardContent>
      </Card>

      {/* Temporary loans need to come back right away, so they stand out. */}
      {activeTemporaryBalances.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <ClockAlert className="size-4" /> Temporary loans to retrieve
          </h2>
          <div className="flex flex-wrap gap-2">
            {activeTemporaryBalances.map((balance) => (
              <span
                key={`temp-${balance.balanceId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-background/60 px-3 py-1.5 text-sm"
              >
                {balance.product?.name}
                <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {balance.quantityTemporaryOwed}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs font-medium">{stat.label}</span>
                <span
                  className={
                    stat.warning
                      ? "flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-500"
                      : "flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary"
                  }
                >
                  {stat.icon}
                </span>
              </div>
              <div
                className={`text-xl font-bold tabular-nums sm:text-2xl ${
                  stat.warning ? "text-rose-500" : ""
                }`}
              >
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4 text-primary" /> Borrowed Equipment
            </CardTitle>
            <CardDescription>Units the customer has with them</CardDescription>
          </CardHeader>
          <CardContent>
            {activeRegularBalances.length === 0 ? (
              <EmptyNote>No borrowed equipment.</EmptyNote>
            ) : (
              <ul className="divide-y">
                {activeRegularBalances.map((balance) => (
                  <li
                    key={balance.balanceId}
                    className="flex items-center justify-between py-2"
                  >
                    <span>{balance.product?.name}</span>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                      {balance.quantityOwed}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-4 text-orange-500" /> Special Discounts
            </CardTitle>
            <CardDescription>Taken off the price of each unit</CardDescription>
          </CardHeader>
          <CardContent>
            {specialPricings.length === 0 ? (
              <EmptyNote>No special discounts.</EmptyNote>
            ) : (
              <ul className="divide-y">
                {specialPricings.map((pricing) => (
                  <li
                    key={pricing.pricingId}
                    className="flex items-center justify-between py-2"
                  >
                    <span>{pricing.product?.name}</span>
                    <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                      −{formatCurrency(pricing.discountAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="size-4 text-primary" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.notes ? (
              <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
            ) : (
              <EmptyNote>No notes.</EmptyNote>
            )}
          </CardContent>
        </Card>
      </div>

      <TabWrapper defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Order History</TabsTrigger>
          <TabsTrigger value="logs">Equipment Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Every order placed by this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderList orders={orders} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Logs</CardTitle>
              <CardDescription>Equipment lent out and returned</CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentLogs logsPromise={logsPromise} />
            </CardContent>
          </Card>
        </TabsContent>
      </TabWrapper>

      <CustomerFormModal barangays={barangays} />
      <LogEquipmentModal products={products} />
      <SpecialPricingModal products={products} />
      <InvoiceFormModal />
      <OrderFormModal />
    </div>
  );
}
