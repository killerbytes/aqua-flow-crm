import type {
  AgingRow,
  CollectionRow,
  SalesPeriodRow,
  SalesProductRow,
  SalesReport,
  VoidRow,
  VoidsReport,
  VoidTypeRow,
} from "@/backend/services/finance-report.service";
import type {
  InactiveCustomerRow,
  InactiveCustomerWithEquipmentRow,
  TemporaryEquipmentRow,
} from "@/backend/services/report.service";
import { businessDateKey, BUSINESS_TIMEZONE } from "@/lib/business-time";
import { toCsv, type CsvValue } from "@/lib/csv";
import { formatPeso as formatMoney } from "@/lib/money";
import { formatInTimeZone } from "date-fns-tz";

/**
 * One column of a report. `value` is what the screen and the printout show;
 * `csv` overrides it for the download, so dates and amounts stay usable in a
 * spreadsheet.
 */
export interface ReportColumn<Row> {
  header: string;
  value: (row: Row) => string | number | null;
  csv?: (row: Row) => CsvValue;
  align?: "left" | "right";
  /** Screen only: where the cell links to. */
  href?: (row: Row) => string | undefined;
}

/** One table of a report. */
export interface ReportTableDefinition<Row> {
  /** Shown above the table when a report has more than one. */
  heading?: string;
  columns: ReportColumn<Row>[];
  emptyMessage: string;
}

export interface ReportMeta {
  slug: string;
  title: string;
  description: string;
}

/** A report that is a single table. */
export interface ReportDefinition<Row>
  extends ReportMeta,
    ReportTableDefinition<Row> {}

/** A table with its rows and an optional totals row, ready to show. */
export interface ReportSection<Row = any> {
  table: ReportTableDefinition<Row>;
  rows: Row[];
  total?: Row;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatReportDate = (date: Date | null) =>
  date ? formatInTimeZone(date, BUSINESS_TIMEZONE, "MMM d, yyyy") : null;

export const formatReportDateTime = (date: Date | null) =>
  date ? formatInTimeZone(date, BUSINESS_TIMEZONE, "MMM d, yyyy h:mm a") : null;

export const formatGeneratedAt = (date: Date) => formatReportDateTime(date)!;

export const formatPeso = (amount: number | null) =>
  amount === null ? null : formatMoney(amount);

/** A range of YYYY-MM-DD Philippine dates, for headings. */
export const formatRange = (from: string, to: string) => {
  const day = (key: string) =>
    formatInTimeZone(new Date(`${key}T12:00:00+08:00`), BUSINESS_TIMEZONE, "MMM d, yyyy");
  return from === to ? day(from) : `${day(from)} – ${day(to)}`;
};

const csvDate = (date: Date | null) => (date ? businessDateKey(date) : null);
const csvDateTime = (date: Date | null) =>
  date ? formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd HH:mm") : null;

/** A money column: pesos on screen, a plain number in the CSV. */
const money = <Row>(
  header: string,
  pick: (row: Row) => number | null,
): ReportColumn<Row> => ({
  header,
  value: (row) => formatPeso(pick(row)),
  csv: (row) => pick(row),
  align: "right",
});

const customerHref = (row: { customerId: number | null }) =>
  row.customerId ? `/customers/${row.customerId}` : undefined;

// ---------------------------------------------------------------------------
// Customer and equipment reports
// ---------------------------------------------------------------------------

const inactiveColumns: ReportColumn<InactiveCustomerRow>[] = [
  {
    header: "Customer",
    value: (row) => row.customerName,
    href: customerHref,
  },
  { header: "Phone", value: (row) => row.phone },
  { header: "Address", value: (row) => row.address },
  {
    header: "Last Order",
    value: (row) => formatReportDate(row.lastOrderAt) ?? "Never ordered",
    csv: (row) => csvDate(row.lastOrderAt) ?? "Never ordered",
  },
  {
    header: "Days Since",
    value: (row) => row.daysSinceLastOrder,
    align: "right",
  },
  {
    header: "Customer Since",
    value: (row) => formatReportDate(row.customerSince),
    csv: (row) => csvDate(row.customerSince),
  },
];

export const inactiveCustomersReport: ReportDefinition<InactiveCustomerRow> = {
  slug: "inactive-customers",
  title: "Inactive Customers",
  description:
    "Active customers who haven't ordered in a while, and customers who have never ordered. Cancelled orders don't count.",
  columns: inactiveColumns,
  emptyMessage: "Every customer has ordered within this period.",
};

const equipmentText = (row: InactiveCustomerWithEquipmentRow) =>
  row.equipment
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(", ");

export const inactiveWithEquipmentReport: ReportDefinition<InactiveCustomerWithEquipmentRow> =
  {
    slug: "inactive-with-equipment",
    title: "Inactive Customers with Equipment",
    description:
      "Inactive customers who still hold regular containers or equipment, so they can be followed up or the equipment collected.",
    columns: [
      ...(inactiveColumns.slice(0, 5) as ReportColumn<InactiveCustomerWithEquipmentRow>[]),
      {
        header: "Equipment Held",
        value: equipmentText,
        csv: (row) =>
          row.equipment
            .map((item) => `${item.productName} x ${item.quantity}`)
            .join("; "),
      },
      { header: "Total Units", value: (row) => row.totalHeld, align: "right" },
    ],
    emptyMessage: "No inactive customer is holding equipment.",
  };

export const temporaryEquipmentReport: ReportDefinition<TemporaryEquipmentRow> =
  {
    slug: "temporary-equipment",
    title: "Temporary Equipment",
    description:
      "Customers holding temporary containers or equipment, longest held first. The date given is that of the oldest unit still out.",
    columns: [
      {
        header: "Customer",
        value: (row) => row.customerName,
        href: customerHref,
      },
      { header: "Phone", value: (row) => row.phone },
      { header: "Product", value: (row) => row.productName },
      { header: "Quantity", value: (row) => row.quantity, align: "right" },
      {
        header: "Given",
        value: (row) => formatReportDate(row.givenAt) ?? "Unknown",
        csv: (row) => csvDate(row.givenAt) ?? "Unknown",
      },
      { header: "Days Held", value: (row) => row.daysHeld, align: "right" },
    ],
    emptyMessage: "No customer is holding temporary equipment.",
  };

// ---------------------------------------------------------------------------
// Money reports
// ---------------------------------------------------------------------------

export const salesReport: ReportMeta = {
  slug: "sales",
  title: "Sales",
  description:
    "Delivered sales by period and by product, dated by delivery, and the money received in the same days.",
};

export const salesByPeriodTable: ReportTableDefinition<SalesPeriodRow> = {
  heading: "Sales by Period",
  columns: [
    { header: "Period", value: (row) => row.label },
    { header: "Orders", value: (row) => row.orders, align: "right" },
    { header: "Units", value: (row) => row.units, align: "right" },
    money("Sales", (row) => row.sales),
  ],
  emptyMessage: "No deliveries in this range.",
};

export const salesByProductTable: ReportTableDefinition<SalesProductRow> = {
  heading: "Sales by Product",
  columns: [
    { header: "Product", value: (row) => row.productName },
    { header: "Units", value: (row) => row.units, align: "right" },
    money("Sales", (row) => row.sales),
  ],
  emptyMessage: "No deliveries in this range.",
};

export const collectionsTable: ReportTableDefinition<CollectionRow> = {
  heading: "Collections by Payment Method",
  columns: [
    { header: "Method", value: (row) => row.method },
    { header: "Payments", value: (row) => row.payments, align: "right" },
    money("From Orders", (row) => row.fromOrders),
    money("From Invoices", (row) => row.fromInvoices),
    money("Total", (row) => row.total),
  ],
  emptyMessage: "No payments received in this range.",
};

/** The Sales report's tables, by the `table` param its CSV route takes. */
export const SALES_CSV_TABLES = {
  period: { table: salesByPeriodTable, name: "sales-by-period" },
  products: { table: salesByProductTable, name: "sales-by-product" },
  collections: { table: collectionsTable, name: "collections" },
} as const;
export type SalesCsvTable = keyof typeof SALES_CSV_TABLES;

export const receivablesReport: ReportDefinition<AgingRow> = {
  slug: "receivables",
  title: "Money Owed (Aging)",
  description:
    "What each customer owes, by how far past due. Open invoices age from their due date; delivered orders that are unpaid and not yet invoiced are due on delivery.",
  columns: [
    { header: "Customer", value: (row) => row.customerName, href: customerHref },
    { header: "Phone", value: (row) => row.phone },
    { header: "Invoices", value: (row) => row.openInvoices, align: "right" },
    { header: "Unbilled Orders", value: (row) => row.unbilledOrders, align: "right" },
    money("Current", (row) => row.current),
    money("1–30 Days", (row) => row.days1to30),
    money("31–60 Days", (row) => row.days31to60),
    money("61–90 Days", (row) => row.days61to90),
    money("90+ Days", (row) => row.over90),
    money("Total Owed", (row) => row.total),
  ],
  emptyMessage: "Nobody owes anything.",
};

export const voidsReport: ReportMeta = {
  slug: "voids",
  title: "Voids & Reversals",
  description:
    "Voided orders and invoices, and reversed payments, with who did each and why. Dated by when the void or reversal happened.",
};

export const voidsTable: ReportTableDefinition<VoidRow> = {
  heading: "Voids & Reversals",
  columns: [
    {
      header: "When",
      value: (row) => formatReportDateTime(row.at),
      csv: (row) => csvDateTime(row.at),
    },
    { header: "Type", value: (row) => row.type },
    { header: "Reference", value: (row) => row.reference },
    { header: "Customer", value: (row) => row.customerName },
    money("Amount", (row) => row.amount),
    { header: "By", value: (row) => row.by },
    { header: "Reason", value: (row) => row.reason },
  ],
  emptyMessage: "Nothing was voided or reversed in this range.",
};

export const voidsByTypeTable: ReportTableDefinition<VoidTypeRow> = {
  heading: "By Type",
  columns: [
    { header: "Type", value: (row) => row.type },
    { header: "Count", value: (row) => row.count, align: "right" },
    money("Amount", (row) => row.amount),
  ],
  emptyMessage: "Nothing was voided or reversed in this range.",
};

/** The Sales report's tables, in the order they show. */
export const salesSections = (report: SalesReport): ReportSection[] => [
  { table: salesByPeriodTable, rows: report.periods, total: report.periodTotal },
  { table: salesByProductTable, rows: report.products, total: report.productTotal },
  { table: collectionsTable, rows: report.collections, total: report.collectionTotal },
];

export const voidsSections = (report: VoidsReport): ReportSection[] => [
  { table: voidsByTypeTable, rows: report.byType, total: report.total },
  { table: voidsTable, rows: report.rows },
];

/** The search params a date-range report passes on to its printout and CSV. */
export const rangeQuery = (
  range: { from: string; to: string },
  extra: Record<string, string> = {},
) => new URLSearchParams({ from: range.from, to: range.to, ...extra }).toString();

// ---------------------------------------------------------------------------

/** The reports, in the order the sidebar and the reports page list them. */
export const REPORTS = [
  inactiveCustomersReport,
  inactiveWithEquipmentReport,
  temporaryEquipmentReport,
  salesReport,
  receivablesReport,
  voidsReport,
].map(({ slug, title, description }) => ({
  slug,
  title,
  description,
  href: `/reports/${slug}`,
}));

export const reportCsv = <Row>(
  table: ReportTableDefinition<Row>,
  rows: Row[],
  total?: Row,
) =>
  toCsv(
    table.columns.map((column) => column.header),
    [...rows, ...(total ? [total] : [])].map((row) =>
      table.columns.map((column) =>
        column.csv ? column.csv(row) : column.value(row),
      ),
    ),
  );
