import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { checkPermission } from "@/backend/rbac/permissions";
import { DashboardService } from "@/backend/services/dashboard.service";
import { MotionCard } from "@/components/animations/MotionCard";
import { SalesTrendChart } from "@/features/dashboard/SalesTrendChart";
import { OrderStatus } from "@/lib/definitions";
import {
  AlertTriangle,
  Droplet,
  Receipt,
  Truck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

function StatCard({
  title,
  value,
  note,
  icon,
  href,
  tone = "default",
  delay,
}: {
  title: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  tone?: "default" | "warning";
  delay: number;
}) {
  const card = (
    <MotionCard delay={delay} className="h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium">{title}</span>
        <div
          className={
            tone === "warning"
              ? "p-2.5 rounded-xl bg-rose-500/10 text-rose-500"
              : "p-2.5 rounded-xl bg-primary/10 text-primary"
          }
        >
          {icon}
        </div>
      </div>
      <div
        className={
          tone === "warning"
            ? "text-3xl font-bold tracking-tight text-rose-500"
            : "text-3xl font-bold tracking-tight"
        }
      >
        {value}
      </div>
      {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
    </MotionCard>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
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
    drivers,
    heldLongest,
  } = await DashboardService.getSummary();
  const lowStock = stock.products.filter((p) => p.isLow);
  const cashBreakdown = Object.entries(cash.byMethod)
    .map(([method, amount]) =>
      `${method === "NOT_RECORDED" ? "method not recorded" : method} ${peso(amount)}`,
    )
    .join(", ");

  const toDeliver = deliveries.pending + deliveries.outForDelivery;
  const driftedProducts = stock.products.filter((p) => !p.matchesLedger);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Today&apos;s sales, deliveries waiting, money owed, and customers to
          follow up.
        </p>
      </div>

      {lowStock.length > 0 && (
        <Link
          href="/products"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Low stock:</strong>{" "}
            {lowStock
              .map((p) => `${p.name} (${p.inStation} left, warning at ${p.lowStockThreshold})`)
              .join(", ")}
          </span>
        </Link>
      )}

      {driftedProducts.length > 0 && (
        <Link
          href="/products"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            Stock totals don&apos;t match the ledger for{" "}
            {driftedProducts.map((p) => p.name).join(", ")}. Check the balance
            sheet on the products page.
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          delay={0.1}
          title="Today's Sales"
          value={peso(today.sales)}
          note={`${plural(today.orderCount, "order")} delivered today`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          delay={0.12}
          title="Cash Collected Today"
          value={peso(cash.total)}
          note={
            cash.paymentCount > 0
              ? cashBreakdown
              : "No payments taken yet today"
          }
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          delay={0.15}
          title="To Deliver"
          value={toDeliver}
          note={`${deliveries.pending} pending, ${deliveries.outForDelivery} out for delivery`}
          icon={<Truck className="w-5 h-5" />}
          href={`/orders?status=${OrderStatus.PENDING}`}
        />
        <StatCard
          delay={0.2}
          title="Money Owed"
          value={peso(receivables.total)}
          note={`${peso(receivables.unbilled.amount)} on ${plural(receivables.unbilled.count, "unbilled order")}, ${peso(receivables.openInvoices.amount)} on ${plural(receivables.openInvoices.count, "open invoice")}`}
          icon={<Receipt className="w-5 h-5" />}
          href="/invoices"
        />
        <StatCard
          delay={0.25}
          title="Overdue Invoices"
          value={peso(receivables.overdueInvoices.amount)}
          note={plural(receivables.overdueInvoices.count, "invoice") + " past due"}
          icon={<AlertTriangle className="w-5 h-5" />}
          tone={receivables.overdueInvoices.count > 0 ? "warning" : "default"}
          href="/invoices"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard
          delay={0.3}
          title="Active Customers"
          value={customers.active}
          note="Not counting walk-in sales"
          icon={<Users className="w-5 h-5" />}
          href="/customers"
        />
        <StatCard
          delay={0.35}
          title={`No Order in ${customers.churnDays}+ Days`}
          value={customers.noRecentOrder}
          note="Active customers who have ordered before, worth a follow-up"
          icon={<AlertTriangle className="w-5 h-5" />}
          tone={customers.noRecentOrder > 0 ? "warning" : "default"}
          href={
            canViewReports
              ? `/reports/customers?days=${customers.churnDays}`
              : undefined
          }
        />
      </div>

      <MotionCard delay={0.38}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">
            Delivered Sales, Last {trend.length} Days
          </span>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <SalesTrendChart days={trend} />
      </MotionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MotionCard delay={0.39}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium">Deliveries Today</span>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deliveries yet today.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {drivers.map((driver) => (
                <li key={driver.name} className="flex justify-between py-2">
                  <span
                    className={
                      driver.name === "Not recorded"
                        ? "text-muted-foreground"
                        : undefined
                    }
                  >
                    {driver.name}
                  </span>
                  <span className="tabular-nums">
                    {plural(driver.count, "delivery")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </MotionCard>

        <MotionCard delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium">Containers Held Longest</span>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
          {heldLongest.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No containers are out with customers.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {heldLongest.map((row) => (
                <li key={`${row.customerId}-${row.productName}`}>
                  <Link
                    href={`/customers/${row.customerId}`}
                    className="flex justify-between gap-4 py-2 hover:underline"
                  >
                    <span>
                      {row.customerName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {row.quantity} {row.productName}
                      </span>
                    </span>
                    <span className="tabular-nums shrink-0">
                      {plural(row.daysIdle, "day")} idle
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </MotionCard>
      </div>

      <MotionCard delay={0.41}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium">Stock by Product</span>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Droplet className="w-5 h-5" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 font-medium text-right">In Station</th>
              <th className="py-2 font-medium text-right">With Customers</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stock.products.map((product) => (
              <tr key={product.productId}>
                <td className="py-2">
                  {product.name}
                  {product.isLow && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Low stock
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">
                  {product.inStation}
                </td>
                <td className="py-2 text-right font-mono">
                  {product.withCustomers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stock.temporaryLoans > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Includes {plural(stock.temporaryLoans, "temporary loan")}.
          </p>
        )}
      </MotionCard>
    </div>
  );
}
