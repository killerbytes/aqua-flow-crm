import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { checkPermission } from "@/backend/rbac/permissions";
import { DashboardService } from "@/backend/services/dashboard.service";
import { MotionCard } from "@/components/animations/MotionCard";
import PageHeader from "@/components/shared/PageHeader";
import { SalesTrendChart } from "@/features/dashboard/SalesTrendChart";
import { OrderStatus } from "@/lib/definitions";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Droplet,
  Package,
  Receipt,
  Truck,
  TrendingUp,
  UserCheck,
  UserX,
  Wallet,
  Users,
  SquareActivity,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  GCASH: "GCash",
  ONLINE: "Online",
  NOT_RECORDED: "Not recorded",
};
const methodLabel = (method: string) => METHOD_LABELS[method] ?? method;

function IconBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500"
          : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      }
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  icon,
  href,
  tone = "default",
  delay,
  children,
}: {
  title: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  tone?: "default" | "warning";
  delay: number;
  children?: React.ReactNode;
}) {
  const card = (
    <MotionCard
      delay={delay}
      className={`flex h-full flex-col ${href ? "group-hover:border-primary/40 group-hover:shadow-md" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <IconBadge tone={tone}>{icon}</IconBadge>
      </div>
      <div
        className={`mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${tone === "warning" ? "text-rose-500" : ""
          }`}
      >
        {value}
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      {children && <div className="mt-auto pt-4">{children}</div>}
      {href && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
          View details <ArrowUpRight className="size-3.5" />
        </span>
      )}
    </MotionCard>
  );

  return href ? (
    <Link href={href} className="group block h-full rounded-[var(--radius)]">
      {card}
    </Link>
  ) : (
    card
  );
}

function Panel({
  title,
  description,
  icon,
  action,
  delay,
  className = "",
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  action?: { href: string; label: string };
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <MotionCard delay={delay} className={`flex flex-col ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge>{icon}</IconBadge>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            {action.label}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </MotionCard>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  await initDatabase();
  const user = await requirePagePermission("VIEW_DASHBOARD");
  const canViewReports = checkPermission(user.role, "VIEW_REPORTS");

  const {
    today,
    cash,
    deliveries,
    receivables,
    customers,
    stock,
    trend,
    heldLongest,
  } = await DashboardService.getSummary();
  const lowStock = stock.products.filter((p) => p.isLow);
  const driftedProducts = stock.products.filter((p) => !p.matchesLedger);
  const toDeliver = deliveries.pending + deliveries.outForDelivery;
  const cashMethods = Object.entries(cash.byMethod);
  const trendTotal = trend.reduce((sum, d) => sum + d.sales, 0);
  const trendOrders = trend.reduce((sum, d) => sum + d.orderCount, 0);
  const hasOverdue = receivables.overdueInvoices.count > 0;

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageHeader>
            <SquareActivity />
            Dashboard
          </PageHeader>

        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {todayLabel}
        </p>
      </div>

      {(lowStock.length > 0 || driftedProducts.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {lowStock.length > 0 && (
            <Link
              href="/products"
              className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm transition-colors hover:bg-amber-500/15"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                <strong className="font-semibold">Low stock: </strong>
                {lowStock
                  .map(
                    (p) =>
                      `${p.name} (${p.inStation} left, warning at ${p.lowStockThreshold})`,
                  )
                  .join(", ")}
              </span>
            </Link>
          )}
          {driftedProducts.length > 0 && (
            <Link
              href="/products"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive transition-colors hover:bg-destructive/15"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Ledger mismatch: </strong>
                stock totals don&apos;t match the ledger for{" "}
                {driftedProducts.map((p) => p.name).join(", ")}. Check the
                balance sheet on the products page.
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Today at a glance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          delay={0.05}
          title="Today's Sales"
          value={peso(today.sales)}
          note={`${plural(today.orderCount, "order")} delivered today`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          delay={0.1}
          title="Cash Collected Today"
          value={peso(cash.total)}
          note={
            cash.paymentCount > 0
              ? plural(cash.paymentCount, "payment")
              : "No payments taken yet today"
          }
          icon={<Wallet className="size-4" />}
        >
          {cashMethods.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cashMethods.map(([method, amount]) => (
                <span
                  key={method}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                >
                  {methodLabel(method)} · {peso(amount)}
                </span>
              ))}
            </div>
          )}
        </StatCard>
        <StatCard
          delay={0.15}
          title="To Deliver"
          value={toDeliver}
          note={plural(toDeliver, "order") + " waiting"}
          icon={<Truck className="size-4" />}
          href={`/orders?status=${OrderStatus.PENDING}`}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted px-2 py-1.5">
              <div className="text-muted-foreground">Pending</div>
              <div className="font-semibold tabular-nums">
                {deliveries.pending}
              </div>
            </div>
            <div className="rounded-md bg-muted px-2 py-1.5">
              <div className="text-muted-foreground">Out for delivery</div>
              <div className="font-semibold tabular-nums">
                {deliveries.outForDelivery}
              </div>
            </div>
          </div>
        </StatCard>
        <StatCard
          delay={0.2}
          title="Money Owed"
          value={peso(receivables.total)}
          note={`${peso(receivables.unbilled.amount)} on ${plural(receivables.unbilled.count, "unbilled order")}, ${peso(receivables.openInvoices.amount)} on ${plural(receivables.openInvoices.count, "open invoice")}`}
          icon={<Receipt className="size-4" />}
          href="/invoices"
        >
          <div
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs ${hasOverdue
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-muted text-muted-foreground"
              }`}
          >
            <span className="flex items-center gap-1.5">
              {hasOverdue && <AlertTriangle className="size-3.5" />}
              {plural(receivables.overdueInvoices.count, "invoice")} overdue
            </span>
            <span className="font-semibold tabular-nums">
              {peso(receivables.overdueInvoices.amount)}
            </span>
          </div>
        </StatCard>
      </div>

      {/* Trend and customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          delay={0.25}
          className="lg:col-span-2"
          title="Delivered Sales"
          description={`Last ${trend.length} days`}
          icon={<TrendingUp className="size-4" />}
        >
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold tabular-nums">
                {peso(trendTotal)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Daily average</div>
              <div className="text-xl font-bold tabular-nums">
                {peso(trend.length ? trendTotal / trend.length : 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Orders</div>
              <div className="text-xl font-bold tabular-nums">
                {trendOrders}
              </div>
            </div>
          </div>
          <SalesTrendChart days={trend} />
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard
            delay={0.3}
            title="Active Customers"
            value={customers.active}
            note="Not counting walk-in sales"
            icon={<UserCheck className="size-4" />}
            href="/customers"
          />
          <StatCard
            delay={0.35}
            title={`No Order in ${customers.churnDays}+ Days`}
            value={customers.noRecentOrder}
            note="Customers who have ordered before, worth a follow-up"
            icon={<UserX className="size-4" />}
            tone={customers.noRecentOrder > 0 ? "warning" : "default"}
            href={
              canViewReports
                ? `/reports/customers?days=${customers.churnDays}`
                : undefined
            }
          />
        </div>
      </div>

      {/* Operations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">

        <Panel
          delay={0.45}
          title="Containers Held Longest"
          description="Units out with customers, longest idle first"
          icon={<Droplet className="size-4" />}
        >
          {heldLongest.length === 0 ? (
            <EmptyState>No containers are out with customers.</EmptyState>
          ) : (
            <ul className="-mx-2 text-sm">
              {heldLongest.map((row) => (
                <li key={`${row.customerId}-${row.productName}`}>
                  <Link
                    href={`/customers/${row.customerId}`}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {row.customerName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.quantity} {row.productName}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                      {plural(row.daysIdle, "day")} idle
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          delay={0.5}
          className="lg:col-span-2 xl:col-span-1"
          title="Stock by Product"
          description="Units in the station and with customers"
          icon={<Package className="size-4" />}
          action={{ href: "/products", label: "Products" }}
        >
          {stock.products.length === 0 ? (
            <EmptyState>No products yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">In Station</th>
                  <th className="pb-2 text-right font-medium">
                    With Customers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stock.products.map((product) => (
                  <tr key={product.productId}>
                    <td className="py-2.5">
                      <span className="font-medium">{product.name}</span>
                      {product.isLow && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          Low
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${product.isLow
                        ? "font-semibold text-amber-700 dark:text-amber-400"
                        : ""
                        }`}
                    >
                      {product.inStation}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {product.withCustomers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {stock.temporaryLoans > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Includes {plural(stock.temporaryLoans, "temporary loan")}.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
