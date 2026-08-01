import { Op } from "sequelize";
import { Customer, Order } from "../models";

export class ReportService {
  /**
   * Calculate total sales for a given date (defaults to today).
   */
  static async getDailySales(date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      },
    });

    const totalSales = orders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );
    return { date: targetDate, totalSales };
  }

  /**
   * Calculate churn customers over the past 7 days.
   */
  static async getWeeklyChurn() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrderCustomers = await Order.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: ["customerId"],
      group: ["customerId"],
    });

    const activeIds = new Set(recentOrderCustomers.map((o) => o.customerId));
    const allCustomers = await Customer.findAll();
    const churnCustomers = allCustomers.filter(
      (c) => !activeIds.has(c.customerId)
    );

    return { timeframe: "7_days", customers: churnCustomers };
  }
}
