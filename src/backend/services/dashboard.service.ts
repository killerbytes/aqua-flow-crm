import { fromCents, toCents } from "@/lib/money";
import {
  CustomerStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
} from "@/lib/definitions";
import {
  BUSINESS_TIMEZONE,
  businessDateKey,
  startOfBusinessDay,
} from "@/lib/business-time";
import { Op } from "sequelize";
import {
  Customer,
  CustomerEquipmentBalance,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  OrderPayment,
  ProductInventory,
  User,
} from "../models";
import { WALK_IN_CUSTOMER_NAME } from "./customer.service";
import { EquipmentService } from "./equipment.service";

export { BUSINESS_TIMEZONE };
export const CHURN_DAYS = 7;
export const TREND_DAYS = 14;
const HELD_LONGEST_LIMIT = 5;

const sumCents = (amounts: number[]) =>
  fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));

export class DashboardService {
  /**
   * Everything the dashboard shows. `now` is a parameter so tests can fix the
   * clock. Days follow Philippine time, whatever timezone the server runs in.
   */
  static async getSummary(now: Date = new Date()) {
    const startOfToday = startOfBusinessDay(now);
    const startOfTomorrow = startOfBusinessDay(now, 1);

    const [
      today,
      cash,
      deliveries,
      receivables,
      customers,
      stock,
      trend,
      drivers,
      heldLongest,
    ] = await Promise.all([
        DashboardService.getTodaysSales(
          startOfToday,
          startOfTomorrow,
        ),
        DashboardService.getCashCollected(
          startOfToday,
          startOfTomorrow,
        ),
        DashboardService.getDeliveryQueue(),
        DashboardService.getReceivables(now),
        DashboardService.getCustomerActivity(now),
        DashboardService.getStock(),
        DashboardService.getSalesTrend(now),
        DashboardService.getDeliveriesByDriver(
          startOfToday,
          startOfTomorrow,
        ),
        DashboardService.getContainersHeldLongest(),
      ]);

    return {
      today,
      cash,
      deliveries,
      receivables,
      customers,
      stock,
      trend,
      drivers,
      heldLongest,
    };
  }

  /** Orders delivered today, whenever they were placed. */
  static async getTodaysSales(start: Date, end: Date) {
    const orders = await Order.findAll({
      attributes: ["totalAmount"],
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { [Op.gte]: start, [Op.lt]: end },
      },
    });

    return {
      sales: sumCents(orders.map((order) => order.totalAmount)),
      orderCount: orders.length,
    };
  }

  /**
   * Money actually taken in today: direct order payments plus invoice payments,
   * leaving out anything reversed. This is what the till should hold.
   */
  static async getCashCollected(start: Date, end: Date) {
    const [orderPayments, invoicePayments] = await Promise.all([
      OrderPayment.findAll({
        attributes: ["amount", "paymentMethod"],
        where: { paidAt: { [Op.gte]: start, [Op.lt]: end }, reversedAt: null },
      }),
      InvoicePayment.findAll({
        attributes: ["paymentAmount", "paymentMethod"],
        where: {
          paymentDate: { [Op.gte]: start, [Op.lt]: end },
          reversedAt: null,
        },
      }),
    ]);

    const byMethod = new Map<string, number>();
    const add = (method: string | null, amount: number) => {
      const key = method || "NOT_RECORDED";
      byMethod.set(key, (byMethod.get(key) ?? 0) + toCents(amount));
    };
    orderPayments.forEach((p) => add(p.paymentMethod, p.amount));
    invoicePayments.forEach((p) => add(p.paymentMethod, p.paymentAmount));

    return {
      total: fromCents([...byMethod.values()].reduce((a, b) => a + b, 0)),
      paymentCount: orderPayments.length + invoicePayments.length,
      byMethod: Object.fromEntries(
        [...byMethod].map(([method, cents]) => [method, fromCents(cents)]),
      ),
    };
  }

  /** Delivered sales for each of the last TREND_DAYS Philippine days, ending today. */
  static async getSalesTrend(now: Date) {
    const first = startOfBusinessDay(now, -(TREND_DAYS - 1));
    const end = startOfBusinessDay(now, 1);

    const orders = await Order.findAll({
      attributes: ["totalAmount", "deliveredAt"],
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { [Op.gte]: first, [Op.lt]: end },
      },
    });

    const days = Array.from({ length: TREND_DAYS }, (_, i) => ({
      date: businessDateKey(startOfBusinessDay(now, i - (TREND_DAYS - 1))),
      cents: 0,
      orderCount: 0,
    }));
    const byDate = new Map(days.map((day) => [day.date, day]));
    for (const order of orders) {
      const date = businessDateKey(order.deliveredAt!);
      const day = byDate.get(date);
      if (day) {
        day.cents += toCents(order.totalAmount);
        day.orderCount++;
      }
    }

    return days.map(({ date, cents, orderCount }) => ({
      date,
      sales: fromCents(cents),
      orderCount,
    }));
  }

  /** Orders delivered today, per person who marked them delivered. */
  static async getDeliveriesByDriver(start: Date, end: Date) {
    const orders = await Order.findAll({
      attributes: ["deliveredBy"],
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { [Op.gte]: start, [Op.lt]: end },
      },
      include: [
        {
          model: User,
          as: "deliveredByUser",
          attributes: ["name"],
          paranoid: false,
        },
      ],
    });

    const counts = new Map<string, number>();
    for (const order of orders) {
      const name = (order as any).deliveredByUser?.name ?? "Not recorded";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Customers who have held containers longest without any activity. */
  static async getContainersHeldLongest() {
    const report = await EquipmentService.getCustomerLiabilityAgingReport();
    return report
      .filter((row) => row.totalHoldings > 0)
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, HELD_LONGEST_LIMIT)
      .map((row) => ({
        customerId: row.customerId,
        customerName: row.customerName,
        productName: row.productName,
        quantity: row.totalHoldings,
        daysIdle: row.daysIdle,
      }));
  }

  static async getDeliveryQueue() {
    const [pending, outForDelivery] = await Promise.all([
      Order.count({ where: { status: OrderStatus.PENDING } }),
      Order.count({ where: { status: OrderStatus.OUT_FOR_DELIVERY } }),
    ]);
    return { pending, outForDelivery };
  }

  /**
   * Money customers owe: delivered orders not yet paid or invoiced, plus what's
   * left on open invoices. Overdue is the part of the latter past its due date.
   */
  static async getReceivables(now: Date) {
    const invoiced = await InvoiceDetail.findAll({
      attributes: ["orderId"],
      where: { voidedAt: null },
    });

    const unbilledOrders = await Order.findAll({
      attributes: ["totalAmount"],
      where: {
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.UNPAID,
        orderId: { [Op.notIn]: invoiced.map((detail) => detail.orderId) },
      },
    });

    const openInvoices = await Invoice.findAll({
      attributes: ["invoiceId", "amount", "dueDate"],
      where: { status: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
    });
    const payments = openInvoices.length
      ? await InvoicePayment.findAll({
          attributes: ["invoiceId", "paymentAmount"],
          where: {
            invoiceId: openInvoices.map((invoice) => invoice.invoiceId),
            reversedAt: null,
          },
        })
      : [];

    const paidCents = new Map<number, number>();
    for (const payment of payments) {
      paidCents.set(
        payment.invoiceId,
        (paidCents.get(payment.invoiceId) ?? 0) +
          toCents(payment.paymentAmount),
      );
    }

    const balances = openInvoices.map((invoice) => ({
      balanceCents: Math.max(
        0,
        toCents(invoice.amount) - (paidCents.get(invoice.invoiceId) ?? 0),
      ),
      overdue: !!invoice.dueDate && invoice.dueDate < now,
    }));
    const overdue = balances.filter((invoice) => invoice.overdue);
    const totalCents = (rows: { balanceCents: number }[]) =>
      rows.reduce((sum, row) => sum + row.balanceCents, 0);

    const unbilled = sumCents(unbilledOrders.map((order) => order.totalAmount));
    const invoicedBalance = fromCents(totalCents(balances));

    return {
      total: fromCents(toCents(unbilled) + toCents(invoicedBalance)),
      unbilled: { amount: unbilled, count: unbilledOrders.length },
      openInvoices: { amount: invoicedBalance, count: openInvoices.length },
      overdueInvoices: {
        amount: fromCents(totalCents(overdue)),
        count: overdue.length,
      },
    };
  }

  /**
   * Active customers, and how many of them have ordered before but not in the
   * last CHURN_DAYS days. The walk-in account isn't a customer.
   */
  static async getCustomerActivity(now: Date) {
    const activeCustomers = await Customer.findAll({
      attributes: ["customerId"],
      where: {
        status: CustomerStatus.ACTIVE,
        name: { [Op.ne]: WALK_IN_CUSTOMER_NAME },
      },
    });
    const activeIds = new Set(
      activeCustomers.map((customer) => customer.customerId),
    );

    // Philippine calendar days, as the inactive customers report counts them,
    // so the number here matches the report this card opens.
    const cutoff = startOfBusinessDay(now, -(CHURN_DAYS - 1));
    const orders = await Order.findAll({
      attributes: ["customerId", "createdAt"],
      where: { status: { [Op.ne]: OrderStatus.CANCELLED } },
    });

    const lastOrder = new Map<number, Date>();
    for (const order of orders) {
      const previous = lastOrder.get(order.customerId);
      if (!previous || order.createdAt > previous) {
        lastOrder.set(order.customerId, order.createdAt);
      }
    }

    let noRecentOrder = 0;
    for (const [customerId, last] of lastOrder) {
      if (activeIds.has(customerId) && last < cutoff) noRecentOrder++;
    }

    return {
      active: activeIds.size,
      noRecentOrder,
      churnDays: CHURN_DAYS,
    };
  }

  /** Per product, because containers and dispensers can't be added together. */
  static async getStock() {
    const [products, balanceSheet, temporary] = await Promise.all([
      ProductInventory.findAll({ order: [["productId", "ASC"]] }),
      EquipmentService.getBalanceSheetReport(),
      CustomerEquipmentBalance.sum("quantityTemporaryOwed"),
    ]);
    const drifted = new Set(
      balanceSheet
        .filter((row) => !row.matchesLedger)
        .map((row) => row.productId),
    );

    return {
      products: products.map((product) => ({
        productId: product.productId,
        name: product.name,
        inStation: product.stockInStation,
        withCustomers: product.stockWithCustomers,
        lowStockThreshold: product.lowStockThreshold,
        isLow:
          product.lowStockThreshold !== null &&
          product.stockInStation <= product.lowStockThreshold,
        matchesLedger: !drifted.has(product.productId),
      })),
      temporaryLoans: temporary || 0,
    };
  }
}
