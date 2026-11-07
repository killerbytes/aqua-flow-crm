import { requirePageUser } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { Customer, Order, ProductInventory } from "@/backend/models";
import { MotionCard } from "@/components/animations/MotionCard";
import { Droplet, Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { Op } from "sequelize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await initDatabase();
  await requirePageUser();

  let customerCount = 0;
  let orderCount = 0;
  let todaySales = 0;
  let totalStockInStation = 0;
  let totalStockWithCustomers = 0;
  let churnRiskCount = 0;

  try {
    customerCount = await Customer.count();
    orderCount = await Order.count();
    totalStockInStation = (await ProductInventory.sum("stock_in_station")) || 0;
    totalStockWithCustomers =
      (await ProductInventory.sum("stock_with_customers")) || 0;

    // Today's Sales Calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfToday,
        },
      },
    });
    todaySales = todayOrders.reduce(
      (sum, ord) => sum + (ord.totalAmount || 0),
      0,
    );

    // Churn Risk (>7 Days without order)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrderCustomers = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
      attributes: ["customer_id"],
      group: ["customer_id"],
    });

    const activeCustomerIds = new Set(
      recentOrderCustomers.map((o) => o.customerId),
    );
    const allCustomers = await Customer.findAll({
      attributes: ["customer_id"],
    });
    churnRiskCount = allCustomers.filter(
      (c) => !activeCustomerIds.has(c.customerId),
    ).length;
  } catch (err) {
    // Fallback when DB is loading
  }

  const formattedSales = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(todaySales);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor daily performance, revenue metrics, container balances, and
            customer retention alerts.
          </p>
        </div>
        <div className="flex items-center gap-1"></div>
      </div>

      {/* Primary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Sales */}
        <MotionCard delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">Today&apos;s Sales</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold  tracking-tight">
            {formattedSales}
          </div>
          <p className="text-xs text-cyan-400/90 font-medium mt-2">
            Real-time revenue update
          </p>
        </MotionCard>

        {/* Total Customers */}
        <MotionCard delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">Total Customers</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold  tracking-tight">
            {customerCount}
          </div>
          <p className="text-xs  font-medium mt-2">Active client accounts</p>
        </MotionCard>

        {/* Churn Risk Alert */}
        {/* <MotionCard delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">
              Churn Risk (&gt;7 days)
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 tracking-tight">
            {churnRiskCount}
          </div>
          <p className="text-xs text-rose-400/90 font-medium mt-2">
            Requires immediate follow-up
          </p>
        </MotionCard> */}
      </div>

      {/* Secondary Operational Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MotionCard delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">Stock in Station</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold ">{totalStockInStation}</div>
          <p className="text-xs  mt-1">Available 5-Gal / Refills</p>
        </MotionCard>

        <MotionCard delay={0.5}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">Containers Out</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold ">{totalStockWithCustomers}</div>
          <p className="text-xs text-amber-400 mt-1">With Active Customers</p>
        </MotionCard>

        <MotionCard delay={0.6}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium ">Total Orders</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold ">{orderCount}</div>
          <p className="text-xs  mt-1">Processed Transactions</p>
        </MotionCard>
      </div>
    </div>
  );
}
