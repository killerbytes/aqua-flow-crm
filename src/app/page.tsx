import { initDatabase } from "@/backend/db/database";
import { Customer, Order, ProductInventory } from "@/backend/models";
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

  return <div className="space-y-8">Dashboard</div>;
}
