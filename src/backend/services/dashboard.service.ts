import { fromCents, toCents } from "@/lib/money";
import {
  CustomerStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
} from "@/lib/definitions";
import moment from "moment-timezone";
import { Op } from "sequelize";
import {
  Customer,
  CustomerEquipmentBalance,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  ProductInventory,
} from "../models";
import { WALK_IN_CUSTOMER_NAME } from "./customer.service";
import { EquipmentService } from "./equipment.service";

export const BUSINESS_TIMEZONE = "Asia/Manila";
export const CHURN_DAYS = 7;

const sumCents = (amounts: number[]) =>
  fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));

export class DashboardService {
  /**
   * Everything the dashboard shows. `now` is a parameter so tests can fix the
   * clock. Days follow Philippine time, whatever timezone the server runs in.
   */
  static async getSummary(now: Date = new Date()) {
    const startOfToday = moment.tz(now, BUSINESS_TIMEZONE).startOf("day");
    const startOfTomorrow = startOfToday.clone().add(1, "day");

    const [today, deliveries, receivables, customers, stock] =
      await Promise.all([
        DashboardService.getTodaysSales(
          startOfToday.toDate(),
          startOfTomorrow.toDate(),
        ),
        DashboardService.getDeliveryQueue(),
        DashboardService.getReceivables(now),
        DashboardService.getCustomerActivity(now),
        DashboardService.getStock(),
      ]);

    return { today, deliveries, receivables, customers, stock };
  }

  /** Orders placed today and delivered, which is how the orders page counts sales. */
  static async getTodaysSales(start: Date, end: Date) {
    const orders = await Order.findAll({
      attributes: ["totalAmount"],
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { [Op.gte]: start, [Op.lt]: end },
      },
    });

    return {
      sales: sumCents(orders.map((order) => order.totalAmount)),
      orderCount: orders.length,
    };
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

    const cutoff = moment(now).subtract(CHURN_DAYS, "days").toDate();
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
        matchesLedger: !drifted.has(product.productId),
      })),
      temporaryLoans: temporary || 0,
    };
  }
}
