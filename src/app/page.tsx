import React from "react";
import { initDatabase } from "@/backend/db/database";
import { Customer, ProductInventory, Order } from "@/backend/models";
import { MotionCard } from "@/components/animations/MotionCard";
import { Users, Package, ShoppingBag, Droplet, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { Op } from "sequelize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await initDatabase();

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
    totalStockWithCustomers = (await ProductInventory.sum("stock_with_customers")) || 0;

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
    todaySales = todayOrders.reduce((sum, ord) => sum + (ord.total_amount || 0), 0);

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

    const activeCustomerIds = new Set(recentOrderCustomers.map((o) => o.customer_id));
    const allCustomers = await Customer.findAll({ attributes: ["customer_id"] });
    churnRiskCount = allCustomers.filter((c) => !activeCustomerIds.has(c.customer_id)).length;
  } catch (err) {
    // Fallback when DB is loading
  }

  const formattedSales = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(todaySales);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card p-8 relative overflow-hidden border border-cyan-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Crystal Clear CRM System • Dashboard Overview
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              AquaFlow Next Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Monitor daily performance, revenue metrics, container balances, and customer retention alerts.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            RBAC Guard: Active
          </div>
        </div>
      </div>

      {/* Primary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Sales */}
        <MotionCard delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Today&apos;s Sales</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-100 tracking-tight">{formattedSales}</div>
          <p className="text-xs text-cyan-400/90 font-medium mt-2">Real-time revenue update</p>
        </MotionCard>

        {/* Total Customers */}
        <MotionCard delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Total Customers</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-100 tracking-tight">{customerCount}</div>
          <p className="text-xs text-slate-400 font-medium mt-2">Active client accounts</p>
        </MotionCard>

        {/* Churn Risk Alert */}
        <MotionCard delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Churn Risk (&gt;7 days)</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 tracking-tight">{churnRiskCount}</div>
          <p className="text-xs text-rose-400/90 font-medium mt-2">Requires immediate follow-up</p>
        </MotionCard>
      </div>

      {/* Secondary Operational Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MotionCard delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Stock in Station</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalStockInStation}</div>
          <p className="text-xs text-slate-400 mt-1">Available 5-Gal / Refills</p>
        </MotionCard>

        <MotionCard delay={0.5}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Containers Out</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalStockWithCustomers}</div>
          <p className="text-xs text-amber-400 mt-1">With Active Customers</p>
        </MotionCard>

        <MotionCard delay={0.6}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Total Orders</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{orderCount}</div>
          <p className="text-xs text-slate-400 mt-1">Processed Transactions</p>
        </MotionCard>
      </div>
    </div>
  );
}
