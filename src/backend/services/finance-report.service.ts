import {
  businessDateKey,
  businessDaysBetween,
  BUSINESS_TIMEZONE,
  parseBusinessDateKey,
  startOfBusinessDay,
} from "@/lib/business-time";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/definitions";
import { fromCents, toCents } from "@/lib/money";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  max as latest,
  min as earliest,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { Op } from "sequelize";
import {
  Customer,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  OrderDetail,
  OrderPayment,
  ProductInventory,
  User,
} from "../models";

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

/** A range of whole Philippine days, `from` and `to` both included. */
export interface DateRange {
  from: string;
  to: string;
  /** The instant `from` begins. */
  start: Date;
  /** The instant after `to` ends. */
  end: Date;
}

/**
 * Reads `from` and `to` search params (YYYY-MM-DD). Missing or invalid dates
 * fall back to this month so far; a reversed range is put the right way round.
 */
export const parseDateRange = (
  params: { from?: unknown; to?: unknown },
  now: Date = new Date(),
): DateRange => {
  const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
  const today = businessDateKey(now);
  const monthStart = formatInTimeZone(now, BUSINESS_TIMEZONE, "yyyy-MM-01");

  let from = parseBusinessDateKey(first(params.from)) ? first(params.from) : monthStart;
  let to = parseBusinessDateKey(first(params.to)) ? first(params.to) : today;
  if (from > to) [from, to] = [to, from];

  return {
    from,
    to,
    start: parseBusinessDateKey(from)!,
    end: startOfBusinessDay(parseBusinessDateKey(to)!, 1),
  };
};

export const SALES_GROUPS = ["day", "week", "month"] as const;
export type SalesGroup = (typeof SALES_GROUPS)[number];

export const parseSalesGroup = (value: unknown): SalesGroup => {
  const group = Array.isArray(value) ? value[0] : value;
  return SALES_GROUPS.includes(group as SalesGroup)
    ? (group as SalesGroup)
    : "day";
};

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface SalesPeriodRow {
  label: string;
  orders: number;
  units: number;
  sales: number;
}

export interface SalesProductRow {
  productName: string;
  /** Null for the surcharges line, which has no units. */
  units: number | null;
  sales: number;
}

export interface CollectionRow {
  method: string;
  payments: number;
  fromOrders: number;
  fromInvoices: number;
  total: number;
}

export interface SalesReport {
  range: DateRange;
  group: SalesGroup;
  periods: SalesPeriodRow[];
  periodTotal: SalesPeriodRow;
  products: SalesProductRow[];
  productTotal: SalesProductRow;
  collections: CollectionRow[];
  collectionTotal: CollectionRow;
}

export const AGING_BUCKETS = [
  { key: "current", label: "Current" },
  { key: "days1to30", label: "1–30 Days" },
  { key: "days31to60", label: "31–60 Days" },
  { key: "days61to90", label: "61–90 Days" },
  { key: "over90", label: "90+ Days" },
] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number]["key"];

export type AgingRow = {
  customerId: number | null;
  customerName: string;
  phone: string | null;
  openInvoices: number;
  unbilledOrders: number;
  total: number;
} & Record<AgingBucket, number>;

export interface AgingReport {
  rows: AgingRow[];
  total: AgingRow;
}

export const VOID_TYPES = {
  ORDER_VOIDED: "Order voided",
  INVOICE_VOIDED: "Invoice voided",
  ORDER_PAYMENT_REVERSED: "Order payment reversed",
  INVOICE_PAYMENT_REVERSED: "Invoice payment reversed",
} as const;
export type VoidType = (typeof VOID_TYPES)[keyof typeof VOID_TYPES];

export interface VoidRow {
  at: Date;
  type: VoidType;
  reference: string;
  customerName: string;
  amount: number;
  by: string;
  reason: string | null;
}

export interface VoidTypeRow {
  type: string;
  count: number;
  amount: number | null;
}

export interface VoidsReport {
  range: DateRange;
  rows: VoidRow[];
  byType: VoidTypeRow[];
  total: VoidTypeRow;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.GCASH]: "GCash",
  [PaymentMethod.ONLINE]: "Online",
};
const NOT_RECORDED = "Not recorded";

/** The order's net line price, in centavos. Discounts are per unit. */
const lineCents = (line: { unitPrice: number; discount: number; quantity: number }) =>
  Math.max(0, toCents(line.unitPrice) - toCents(line.discount)) * line.quantity;

/**
 * Philippine calendar dates are handled below as plain local dates (parseISO
 * of YYYY-MM-DD, and toZonedTime for instants), so date-fns calendar math
 * works on Philippine days whatever timezone the server runs in.
 */
const periodStart = (date: Date, group: SalesGroup) =>
  group === "month"
    ? startOfMonth(date)
    : group === "week"
      ? startOfWeek(date, { weekStartsOn: 1 })
      : date;

const periodKey = (instant: Date, group: SalesGroup) =>
  format(periodStart(toZonedTime(instant, BUSINESS_TIMEZONE), group), "yyyy-MM-dd");

/** Every period the range touches, labeled, partial ones clipped to the range. */
const periodsOf = (range: DateRange, group: SalesGroup) => {
  const first = parseISO(range.from);
  const last = parseISO(range.to);
  const step = group === "month" ? addMonths : group === "week" ? addWeeks : addDays;

  const periods: { key: string; label: string }[] = [];
  for (let cursor = periodStart(first, group); cursor <= last; cursor = step(cursor, 1)) {
    const from = latest([cursor, first]);
    const to = earliest([
      group === "month"
        ? endOfMonth(cursor)
        : group === "week"
          ? endOfWeek(cursor, { weekStartsOn: 1 })
          : cursor,
      last,
    ]);
    const label =
      group === "day"
        ? format(cursor, "EEE, MMM d, yyyy")
        : group === "month"
          ? format(cursor, "MMMM yyyy")
          : `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
    periods.push({ key: format(cursor, "yyyy-MM-dd"), label });
  }
  return periods;
};

const bucketOf = (daysPastDue: number): AgingBucket =>
  daysPastDue <= 0
    ? "current"
    : daysPastDue <= 30
      ? "days1to30"
      : daysPastDue <= 60
        ? "days31to60"
        : daysPastDue <= 90
          ? "days61to90"
          : "over90";

const userName = (user?: { name?: string } | null) => user?.name ?? "Not recorded";

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export class FinanceReportService {
  /**
   * Delivered sales in the range, by period and by product, and the money
   * actually received in it. Sales are dated by delivery, as on the dashboard;
   * collections by payment date, leaving out anything reversed.
   */
  static async getSales(range: DateRange, group: SalesGroup = "day"): Promise<SalesReport> {
    const inRange = { [Op.gte]: range.start, [Op.lt]: range.end };

    const [orders, orderPayments, invoicePayments] = await Promise.all([
      Order.findAll({
        attributes: ["orderId", "totalAmount", "surcharge", "deliveredAt"],
        where: { status: OrderStatus.DELIVERED, deliveredAt: inRange },
        include: [
          {
            model: OrderDetail,
            as: "orderDetails",
            attributes: ["productId", "quantity", "unitPrice", "discount"],
            include: [
              {
                model: ProductInventory,
                as: "product",
                attributes: ["name"],
                paranoid: false,
              },
            ],
          },
        ],
      }),
      OrderPayment.findAll({
        attributes: ["amount", "paymentMethod"],
        where: { paidAt: inRange, reversedAt: null },
      }),
      InvoicePayment.findAll({
        attributes: ["paymentAmount", "paymentMethod"],
        where: { paymentDate: inRange, reversedAt: null },
      }),
    ]);

    // By period
    const periods = periodsOf(range, group).map((p) => ({
      ...p,
      orders: 0,
      units: 0,
      cents: 0,
    }));
    const byKey = new Map(periods.map((p) => [p.key, p]));

    // By product
    const products = new Map<number, { productName: string; units: number; cents: number }>();
    let surchargeCents = 0;

    for (const order of orders) {
      const period = byKey.get(periodKey(order.deliveredAt!, group));
      const units = order.orderDetails.reduce((sum, line) => sum + line.quantity, 0);
      if (period) {
        period.orders++;
        period.units += units;
        period.cents += toCents(order.totalAmount);
      }

      for (const line of order.orderDetails) {
        const product = products.get(line.productId) ?? {
          productName: line.product?.name ?? "Unknown product",
          units: 0,
          cents: 0,
        };
        product.units += line.quantity;
        product.cents += lineCents(line);
        products.set(line.productId, product);
      }
      surchargeCents += toCents(order.surcharge);
    }

    const periodRows = periods.map(({ label, orders, units, cents }) => ({
      label,
      orders,
      units,
      sales: fromCents(cents),
    }));
    const productRows: SalesProductRow[] = [...products.values()]
      .sort((a, b) => b.cents - a.cents || a.productName.localeCompare(b.productName))
      .map(({ productName, units, cents }) => ({ productName, units, sales: fromCents(cents) }));
    if (surchargeCents > 0) {
      productRows.push({ productName: "Surcharges", units: null, sales: fromCents(surchargeCents) });
    }

    // Collections
    const methods = new Map<string, { payments: number; orderCents: number; invoiceCents: number }>();
    const collect = (method: PaymentMethod | null, cents: number, fromInvoice: boolean) => {
      const label = (method && PAYMENT_METHOD_LABELS[method]) || NOT_RECORDED;
      const row = methods.get(label) ?? { payments: 0, orderCents: 0, invoiceCents: 0 };
      row.payments++;
      if (fromInvoice) row.invoiceCents += cents;
      else row.orderCents += cents;
      methods.set(label, row);
    };
    orderPayments.forEach((p) => collect(p.paymentMethod, toCents(p.amount), false));
    invoicePayments.forEach((p) => collect(p.paymentMethod, toCents(p.paymentAmount), true));

    const methodOrder = [...Object.values(PAYMENT_METHOD_LABELS), NOT_RECORDED];
    const collectionRows = [...methods]
      .sort(([a], [b]) => methodOrder.indexOf(a) - methodOrder.indexOf(b))
      .map(([method, row]) => ({
        method,
        payments: row.payments,
        fromOrders: fromCents(row.orderCents),
        fromInvoices: fromCents(row.invoiceCents),
        total: fromCents(row.orderCents + row.invoiceCents),
      }));

    const sumCents = <T>(rows: T[], pick: (row: T) => number) =>
      rows.reduce((sum, row) => sum + pick(row), 0);
    const allMethods = [...methods.values()];

    return {
      range,
      group,
      periods: periodRows,
      periodTotal: {
        label: "Total",
        orders: orders.length,
        units: sumCents(periods, (p) => p.units),
        sales: fromCents(sumCents(periods, (p) => p.cents)),
      },
      products: productRows,
      productTotal: {
        productName: "Total",
        units: sumCents([...products.values()], (p) => p.units),
        sales: fromCents(sumCents([...products.values()], (p) => p.cents) + surchargeCents),
      },
      collections: collectionRows,
      collectionTotal: {
        method: "Total",
        payments: sumCents(allMethods, (m) => m.payments),
        fromOrders: fromCents(sumCents(allMethods, (m) => m.orderCents)),
        fromInvoices: fromCents(sumCents(allMethods, (m) => m.invoiceCents)),
        total: fromCents(sumCents(allMethods, (m) => m.orderCents + m.invoiceCents)),
      },
    };
  }

  /**
   * What each customer owes, by how far past due. Open invoices count what's
   * left after payments that stand, from the due date. Delivered orders that
   * are unpaid and not on an active invoice are due on delivery. The grand
   * total matches the dashboard's receivables.
   */
  static async getReceivablesAging(now: Date = new Date()): Promise<AgingReport> {
    const [openInvoices, unpaidOrders, invoiced] = await Promise.all([
      Invoice.findAll({
        attributes: ["invoiceId", "customerId", "amount", "dueDate", "dateIssued"],
        where: { status: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
        include: [
          { model: Customer, as: "customer", attributes: ["name", "phone"], paranoid: false },
        ],
      }),
      Order.findAll({
        attributes: ["orderId", "customerId", "totalAmount", "deliveredAt", "createdAt"],
        where: { status: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.UNPAID },
        include: [
          { model: Customer, as: "customer", attributes: ["name", "phone"], paranoid: false },
        ],
      }),
      InvoiceDetail.findAll({ attributes: ["orderId"], where: { voidedAt: null } }),
    ]);

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
        (paidCents.get(payment.invoiceId) ?? 0) + toCents(payment.paymentAmount),
      );
    }

    type Tally = {
      customerName: string;
      phone: string | null;
      openInvoices: number;
      unbilledOrders: number;
    } & Record<AgingBucket, number>;
    const tallies = new Map<number, Tally>();
    const tallyFor = (customerId: number, customer?: Customer | null) => {
      let tally = tallies.get(customerId);
      if (!tally) {
        tally = {
          customerName: customer?.name ?? "Unknown customer",
          phone: customer?.phone || null,
          openInvoices: 0,
          unbilledOrders: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
        };
        tallies.set(customerId, tally);
      }
      return tally;
    };

    for (const invoice of openInvoices) {
      const owedCents = Math.max(
        0,
        toCents(invoice.amount) - (paidCents.get(invoice.invoiceId) ?? 0),
      );
      if (owedCents === 0) continue;
      const tally = tallyFor(invoice.customerId, invoice.customer);
      tally.openInvoices++;
      // Invoices are given a due date when made; one without falls due on issue.
      const due = invoice.dueDate ?? invoice.dateIssued;
      tally[bucketOf(businessDaysBetween(due, now))] += owedCents;
    }

    const invoicedIds = new Set(invoiced.map((detail) => detail.orderId));
    for (const order of unpaidOrders) {
      if (invoicedIds.has(order.orderId)) continue;
      const owedCents = toCents(order.totalAmount);
      if (owedCents === 0) continue;
      const tally = tallyFor(order.customerId, order.customer);
      tally.unbilledOrders++;
      // Orders delivered before delivery dates were recorded age from when they were placed.
      tally[bucketOf(businessDaysBetween(order.deliveredAt ?? order.createdAt, now))] += owedCents;
    }

    const toRow = (customerId: number | null, tally: Tally): AgingRow => {
      const totalCents = AGING_BUCKETS.reduce((sum, b) => sum + tally[b.key], 0);
      return {
        customerId,
        customerName: tally.customerName,
        phone: tally.phone,
        openInvoices: tally.openInvoices,
        unbilledOrders: tally.unbilledOrders,
        current: fromCents(tally.current),
        days1to30: fromCents(tally.days1to30),
        days31to60: fromCents(tally.days31to60),
        days61to90: fromCents(tally.days61to90),
        over90: fromCents(tally.over90),
        total: fromCents(totalCents),
      };
    };

    const grand: Tally = {
      customerName: "Total",
      phone: null,
      openInvoices: 0,
      unbilledOrders: 0,
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };
    for (const tally of tallies.values()) {
      grand.openInvoices += tally.openInvoices;
      grand.unbilledOrders += tally.unbilledOrders;
      for (const { key } of AGING_BUCKETS) grand[key] += tally[key];
    }

    return {
      rows: [...tallies]
        .map(([customerId, tally]) => toRow(customerId, tally))
        .sort((a, b) => b.total - a.total || a.customerName.localeCompare(b.customerName)),
      total: toRow(null, grand),
    };
  }

  /**
   * Voided orders and invoices, and reversed payments, in the range, newest
   * first, with who did each and why. Orders cancelled before voiding was
   * recorded have no void date, so they don't appear.
   */
  static async getVoidsAndReversals(range: DateRange): Promise<VoidsReport> {
    const inRange = { [Op.gte]: range.start, [Op.lt]: range.end };
    const customerInclude = {
      model: Customer,
      as: "customer",
      attributes: ["name"],
      paranoid: false,
    };
    const byInclude = (as: string) => ({
      model: User,
      as,
      attributes: ["name"],
      paranoid: false,
    });

    const [orders, invoices, orderPayments, invoicePayments] = await Promise.all([
      Order.findAll({
        attributes: ["orderId", "totalAmount", "voidedAt", "voidReason"],
        where: { voidedAt: inRange },
        include: [customerInclude, byInclude("voidedByUser")],
      }),
      Invoice.findAll({
        attributes: ["invoiceId", "amount", "voidedAt", "voidReason"],
        where: { voidedAt: inRange },
        include: [customerInclude, byInclude("voidedByUser")],
      }),
      OrderPayment.findAll({
        attributes: ["id", "orderId", "amount", "reversedAt", "reversalReason"],
        where: { reversedAt: inRange },
        include: [
          {
            model: Order,
            as: "order",
            attributes: ["orderId"],
            include: [customerInclude],
          },
          byInclude("reversedByUser"),
        ],
      }),
      InvoicePayment.findAll({
        attributes: ["id", "invoiceId", "paymentAmount", "reversedAt", "reversalReason"],
        where: { reversedAt: inRange },
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: ["invoiceId"],
            include: [customerInclude],
          },
          byInclude("reversedByUser"),
        ],
      }),
    ]);

    const customerName = (record: any) => record?.customer?.name ?? "Unknown customer";
    const rows: VoidRow[] = [
      ...orders.map((order: any) => ({
        at: order.voidedAt,
        type: VOID_TYPES.ORDER_VOIDED,
        reference: `Order #${order.orderId}`,
        customerName: customerName(order),
        amount: order.totalAmount,
        by: userName(order.voidedByUser),
        reason: order.voidReason,
      })),
      ...invoices.map((invoice: any) => ({
        at: invoice.voidedAt,
        type: VOID_TYPES.INVOICE_VOIDED,
        reference: `Invoice #${invoice.invoiceId}`,
        customerName: customerName(invoice),
        amount: invoice.amount,
        by: userName(invoice.voidedByUser),
        reason: invoice.voidReason,
      })),
      ...orderPayments.map((payment: any) => ({
        at: payment.reversedAt,
        type: VOID_TYPES.ORDER_PAYMENT_REVERSED,
        reference: `Order #${payment.orderId}`,
        customerName: customerName(payment.order),
        amount: payment.amount,
        by: userName(payment.reversedByUser),
        reason: payment.reversalReason,
      })),
      ...invoicePayments.map((payment: any) => ({
        at: payment.reversedAt,
        type: VOID_TYPES.INVOICE_PAYMENT_REVERSED,
        reference: `Invoice #${payment.invoiceId}`,
        customerName: customerName(payment.invoice),
        amount: payment.paymentAmount,
        by: userName(payment.reversedByUser),
        reason: payment.reversalReason,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const byType = Object.values(VOID_TYPES).map((type) => {
      const ofType = rows.filter((row) => row.type === type);
      return {
        type,
        count: ofType.length,
        amount: fromCents(ofType.reduce((sum, row) => sum + toCents(row.amount), 0)),
      };
    });

    return {
      range,
      rows,
      byType,
      // No grand amount: voiding an order also reverses its payment, so adding
      // the types together would count the same money twice.
      total: { type: "Total", count: rows.length, amount: null },
    };
  }
}
