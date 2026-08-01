import React from "react";
import { initDatabase } from "@/backend/db/database";
import { Order, Customer } from "@/backend/models";
import { UI_DEFAULTS } from "@/lib/definitions";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Op } from "sequelize";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await initDatabase();

  let todaySales = 0;
  let orderCountToday = 0;
  let churnRiskCustomers: any[] = [];

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = await Order.findAll({
      where: { createdAt: { [Op.gte]: startOfToday } },
      include: [{ model: Customer }],
    });

    orderCountToday = todayOrders.length;
    todaySales = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: ["customer_id"],
      group: ["customer_id"],
    });

    const activeCustomerIds = new Set(recentOrders.map((o) => o.customer_id));
    const allCustomers = await Customer.findAll();
    churnRiskCustomers = allCustomers.filter((c) => !activeCustomerIds.has(c.customer_id));
  } catch (err) {
    // Fallback
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border border-cyan-500/20">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            CRM Reports & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Revenue metrics, daily sales reports, and customer churn retention analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Sales Overview Card */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Daily Sales Revenue Report
            </h3>
            <Badge variant="success">Active Today</Badge>
          </div>
          <div className="text-3xl font-extrabold font-mono text-cyan-300">
            {UI_DEFAULTS.CURRENCY_SYMBOL}{todaySales.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400">
            Total of <span className="font-semibold text-slate-200">{orderCountToday}</span> refill orders processed today.
          </p>
        </div>

        {/* Churn Risk Summary */}
        <div className="glass-card p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Weekly Churn Risk (&gt;7 Days)
            </h3>
            <Badge variant="danger">{churnRiskCustomers.length} At-Risk Accounts</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Customers with no recorded orders in the last 7 days requiring proactive station outreach.
          </p>
        </div>
      </div>

      {/* Churn Risk Customer List */}
      <div className="glass-card overflow-hidden border border-slate-800">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            At-Risk Customer Accounts
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Delivery Address</th>
                <th className="p-4">Phone Contact</th>
                <th className="p-4">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {churnRiskCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    All customers have active recent orders! Zero churn risk.
                  </td>
                </tr>
              ) : (
                churnRiskCustomers.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-semibold text-slate-100">{cust.name}</td>
                    <td className="p-4 text-slate-300">{cust.address}</td>
                    <td className="p-4 text-slate-300 font-mono">{cust.phone}</td>
                    <td className="p-4">
                      <Badge variant={cust.customer_type === "COMMERCIAL" ? "info" : "default"}>
                        {cust.customer_type}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
