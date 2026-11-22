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
  PAYMENT_METHOD_LABELS,
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
  RetailProduct,
  RetailSale,
  RetailSaleItem,
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
  /** Delivered orders. */
  orders: number;
  /** Retail sales that stand. */
  retailSales: number;
  units: number;
  sales: number;
}

export const SALES_SOURCES = { ORDERS: "Orders", RETAIL: "Retail" } as const;
export type SalesSource = (typeof SALES_SOURCES)[keyof typeof SALES_SOURCES];

/** The Sales report line for walk-in counter sales, which aren't itemized. */
export const WALK_IN_SALES_LINE = "Walk-in Sales (not itemized)";

export interface SalesProductRow {
  /** Null on the totals row. */
  source: SalesSource | null;
  productName: string;
  /**
   * Null for the walk-in, surcharges, and discounts lines, which have no
   * units.
   */
  units: number | null;
  /** Negative on the retail discounts line. */
  sales: number;
}

export interface CollectionRow {
  method: string;
  payments: number;
  fromOrders: number;
  fromInvoices: number;
  fromRetail: number;
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
  RETAIL_SALE_VOIDED: "Retail sale voided",
} as const;
export type VoidType = (typeof VOID_TYPES)[keyof typeof VOID_TYPES];

export interface VoidRow {
  at: Date;
  type: VoidType;
  reference: string;
  customerName: string;
  amount: number;
  by: string;
  byUserId: number | null;
  byRole: string | null;
  reason: string | null;
}

export interface VoidTypeRow {
  type: string;
  count: number;
  amount: number | null;
}

/** What one person voided and reversed in the range. */
export interface VoidUserRow {
  by: string;
  /** The person's role now; null on the totals row or when nobody is recorded. */
  role: string | null;
  ordersVoided: number;
  ordersVoidedAmount: number;
  invoicesVoided: number;
  /** Includes the payment reversed by voiding a paid order. */
  paymentsReversed: number;
  retailSalesVoided: number;
}

export interface VoidsReport {
  range: DateRange;
  rows: VoidRow[];
  byType: VoidTypeRow[];
  total: VoidTypeRow;
  /** Most orders voided first. */
  byUser: VoidUserRow[];
  byUserTotal: VoidUserRow;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
   * Sales in the range, by period and by product, and the money actually
   * received in it. Delivered orders are dated by delivery and retail sales by
   * when they were made, as on the dashboard; voided retail sales don't count.
   * Collections go by payment date, leaving out anything reversed. A retail
   * sale is paid when made, so it is a collection on the same day.
   */
  static async getSales(range: DateRange, group: SalesGroup = "day"): Promise<SalesReport> {
    const inRange = { [Op.gte]: range.start, [Op.lt]: range.end };

    const [orders, orderPayments, invoicePayments, retailSales] = await Promise.all([
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
      RetailSale.findAll({
        attributes: ["saleId", "totalAmount", "discount", "paymentMethod", "soldAt"],
        where: { soldAt: inRange, voidedAt: null },
        include: [
          {
            model: RetailSaleItem,
            as: "items",
            attributes: ["itemId", "productId", "quantity", "unitPrice"],
            include: [{ model: RetailProduct, as: "product", attributes: ["name"] }],
          },
        ],
      }),
    ]);

    // By period
    const periods = periodsOf(range, group).map((p) => ({
      ...p,
      orders: 0,
      retailSales: 0,
      units: 0,
      cents: 0,
    }));
    const byKey = new Map(periods.map((p) => [p.key, p]));

    // By product. Refill and retail products are numbered apart, so their ids
    // overlap and each kind has its own tally.
    type ProductTally = { productName: string; units: number; cents: number };
    const products = new Map<number, ProductTally>();
    const retailProducts = new Map<number, ProductTally>();
    let surchargeCents = 0;
    let walkInCents = 0;
    let retailDiscountCents = 0;

    for (const order of orders) {
      // Walk-in counter sales are one cash total with no items, so they get
      // their own line for the products to still add up to the sales.
      if (order.orderDetails.length === 0) {
        walkInCents += toCents(order.totalAmount) - toCents(order.surcharge);
      }
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

    for (const sale of retailSales) {
      const items = sale.items ?? [];
      const period = byKey.get(periodKey(sale.soldAt, group));
      if (period) {
        period.retailSales++;
        period.units += items.reduce((sum, line) => sum + line.quantity, 0);
        period.cents += toCents(sale.totalAmount);
      }

      // Lines at their full price; the discounts, taken off whole bills, get
      // their own line so the products still add up to the sales.
      for (const line of items) {
        const product = retailProducts.get(line.productId) ?? {
          productName: line.product?.name ?? "Unknown product",
          units: 0,
          cents: 0,
        };
        product.units += line.quantity;
        product.cents += toCents(line.unitPrice) * line.quantity;
        retailProducts.set(line.productId, product);
      }
      retailDiscountCents += toCents(sale.discount);
    }

    const periodRows = periods.map(({ label, orders, retailSales, units, cents }) => ({
      label,
      orders,
      retailSales,
      units,
      sales: fromCents(cents),
    }));
    const productLines = (tallies: Map<number, ProductTally>, source: SalesSource) =>
      [...tallies.values()]
        .sort((a, b) => b.cents - a.cents || a.productName.localeCompare(b.productName))
        .map(({ productName, units, cents }) => ({
          source,
          productName,
          units,
          sales: fromCents(cents),
        }));
    const productRows: SalesProductRow[] = productLines(products, SALES_SOURCES.ORDERS);
    if (walkInCents > 0) {
      productRows.push({
        source: SALES_SOURCES.ORDERS,
        productName: WALK_IN_SALES_LINE,
        units: null,
        sales: fromCents(walkInCents),
      });
    }
    if (surchargeCents > 0) {
      productRows.push({
        source: SALES_SOURCES.ORDERS,
        productName: "Surcharges",
        units: null,
        sales: fromCents(surchargeCents),
      });
    }
    productRows.push(...productLines(retailProducts, SALES_SOURCES.RETAIL));
    if (retailDiscountCents > 0) {
      productRows.push({
        source: SALES_SOURCES.RETAIL,
        productName: "Retail Discounts",
        units: null,
        sales: fromCents(-retailDiscountCents),
      });
    }

    // Collections
    type CollectionSource = "order" | "invoice" | "retail";
    const methods = new Map<string, { payments: number } & Record<CollectionSource, number>>();
    const collect = (method: PaymentMethod | null, cents: number, source: CollectionSource) => {
      const label = (method && PAYMENT_METHOD_LABELS[method]) || NOT_RECORDED;
      const row = methods.get(label) ?? { payments: 0, order: 0, invoice: 0, retail: 0 };
      row.payments++;
      row[source] += cents;
      methods.set(label, row);
    };
    orderPayments.forEach((p) => collect(p.paymentMethod, toCents(p.amount), "order"));
    invoicePayments.forEach((p) => collect(p.paymentMethod, toCents(p.paymentAmount), "invoice"));
    retailSales.forEach((sale) => collect(sale.paymentMethod, toCents(sale.totalAmount), "retail"));

    const methodOrder = [...Object.values(PAYMENT_METHOD_LABELS), NOT_RECORDED];
    const collectionRows = [...methods]
      .sort(([a], [b]) => methodOrder.indexOf(a) - methodOrder.indexOf(b))
      .map(([method, row]) => ({
        method,
        payments: row.payments,
        fromOrders: fromCents(row.order),
        fromInvoices: fromCents(row.invoice),
        fromRetail: fromCents(row.retail),
        total: fromCents(row.order + row.invoice + row.retail),
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
        retailSales: retailSales.length,
        units: sumCents(periods, (p) => p.units),
        sales: fromCents(sumCents(periods, (p) => p.cents)),
      },
      products: productRows,
      productTotal: {
        source: null,
        productName: "Total",
        units:
          sumCents([...products.values()], (p) => p.units) +
          sumCents([...retailProducts.values()], (p) => p.units),
        sales: fromCents(
          sumCents([...products.values()], (p) => p.cents) +
            walkInCents +
            surchargeCents +
            sumCents([...retailProducts.values()], (p) => p.cents) -
            retailDiscountCents,
        ),
      },
      collections: collectionRows,
      collectionTotal: {
        method: "Total",
        payments: sumCents(allMethods, (m) => m.payments),
        fromOrders: fromCents(sumCents(allMethods, (m) => m.order)),
        fromInvoices: fromCents(sumCents(allMethods, (m) => m.invoice)),
        fromRetail: fromCents(sumCents(allMethods, (m) => m.retail)),
        total: fromCents(sumCents(allMethods, (m) => m.order + m.invoice + m.retail)),
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
   * Voided orders, invoices, and retail sales, and reversed payments, in the
   * range, newest first, with who did each and why. Orders cancelled before
   * voiding was recorded have no void date, so they don't appear. A retail
   * sale's payment is on the sale, so voiding one reverses no separate payment.
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
      attributes: ["userId", "name", "role"],
      paranoid: false,
    });
    const by = (user?: { userId: number; name: string; role: string } | null) => ({
      by: userName(user),
      byUserId: user?.userId ?? null,
      byRole: user?.role ?? null,
    });

    const [orders, invoices, orderPayments, invoicePayments, retailSales] = await Promise.all([
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
      RetailSale.findAll({
        attributes: ["saleId", "totalAmount", "voidedAt", "voidReason"],
        where: { voidedAt: inRange },
        include: [customerInclude, byInclude("voidedByUser")],
      }),
    ]);

    const customerName = (record?: { customer?: { name: string } }) =>
      record?.customer?.name ?? "Unknown customer";
    const rows: VoidRow[] = [
      ...orders.map((order) => ({
        at: order.voidedAt,
        type: VOID_TYPES.ORDER_VOIDED,
        reference: `Order #${order.orderId}`,
        customerName: customerName(order),
        amount: order.totalAmount,
        ...by(order.voidedByUser),
        reason: order.voidReason,
      })),
      ...invoices.map((invoice) => ({
        at: invoice.voidedAt,
        type: VOID_TYPES.INVOICE_VOIDED,
        reference: `Invoice #${invoice.invoiceId}`,
        customerName: customerName(invoice),
        amount: invoice.amount,
        ...by(invoice.voidedByUser),
        reason: invoice.voidReason,
      })),
      ...orderPayments.map((payment) => ({
        at: payment.reversedAt,
        type: VOID_TYPES.ORDER_PAYMENT_REVERSED,
        reference: `Order #${payment.orderId}`,
        customerName: customerName(payment.order),
        amount: payment.amount,
        ...by(payment.reversedByUser),
        reason: payment.reversalReason,
      })),
      ...invoicePayments.map((payment) => ({
        at: payment.reversedAt,
        type: VOID_TYPES.INVOICE_PAYMENT_REVERSED,
        reference: `Invoice #${payment.invoiceId}`,
        customerName: customerName(payment.invoice),
        amount: payment.paymentAmount,
        ...by(payment.reversedByUser),
        reason: payment.reversalReason,
      })),
      ...retailSales.map((sale) => ({
        at: sale.voidedAt,
        type: VOID_TYPES.RETAIL_SALE_VOIDED,
        reference: `Retail sale #${sale.saleId}`,
        customerName: customerName(sale),
        amount: sale.totalAmount,
        ...by(sale.voidedByUser),
        reason: sale.voidReason,
      })),
    ]
      // Each query asks for a date in the range, so none of these is missing one.
      .filter((row): row is typeof row & { at: Date } => row.at !== null)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const byType = Object.values(VOID_TYPES).map((type) => {
      const ofType = rows.filter((row) => row.type === type);
      return {
        type,
        count: ofType.length,
        amount: fromCents(ofType.reduce((sum, row) => sum + toCents(row.amount), 0)),
      };
    });

    // Per person, with order amounts kept in centavos until the end.
    const users = new Map<number | null, VoidUserRow & { cents: number }>();
    for (const row of rows) {
      let user = users.get(row.byUserId);
      if (!user) {
        user = {
          by: row.by,
          role: row.byRole,
          ordersVoided: 0,
          ordersVoidedAmount: 0,
          invoicesVoided: 0,
          paymentsReversed: 0,
          retailSalesVoided: 0,
          cents: 0,
        };
        users.set(row.byUserId, user);
      }
      if (row.type === VOID_TYPES.ORDER_VOIDED) {
        user.ordersVoided += 1;
        user.cents += toCents(row.amount);
      } else if (row.type === VOID_TYPES.INVOICE_VOIDED) {
        user.invoicesVoided += 1;
      } else if (row.type === VOID_TYPES.RETAIL_SALE_VOIDED) {
        user.retailSalesVoided += 1;
      } else {
        user.paymentsReversed += 1;
      }
    }
    const byUser: VoidUserRow[] = [...users.values()]
      .map(({ cents, ...user }) => ({ ...user, ordersVoidedAmount: fromCents(cents) }))
      .sort((a, b) => b.ordersVoided - a.ordersVoided || a.by.localeCompare(b.by));
    const count = (pick: (row: VoidUserRow) => number) =>
      byUser.reduce((sum, row) => sum + pick(row), 0);

    return {
      range,
      rows,
      byType,
      // No grand amount: voiding an order also reverses its payment, so adding
      // the types together would count the same money twice.
      total: { type: "Total", count: rows.length, amount: null },
      byUser,
      byUserTotal: {
        by: "Total",
        role: null,
        ordersVoided: count((row) => row.ordersVoided),
        ordersVoidedAmount: fromCents(count((row) => toCents(row.ordersVoidedAmount))),
        invoicesVoided: count((row) => row.invoicesVoided),
        paymentsReversed: count((row) => row.paymentsReversed),
        retailSalesVoided: count((row) => row.retailSalesVoided),
      },
    };
  }
}
