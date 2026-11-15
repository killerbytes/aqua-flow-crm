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
import type { EquipmentService } from "@/backend/services/equipment.service";
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

type BalanceRow = Awaited<
  ReturnType<typeof EquipmentService.getBalanceSheetReport>
>[number];
type LossesRow = Awaited<ReturnType<typeof EquipmentService.getLossesReport>>[number];

/** A balance sheet row, or the totals row, which has no product of its own. */
type BalanceSheetRow = Omit<BalanceRow, "productId"> & {
  productId: number | null;
  /** Totals row only: how many products have drifted from their ledger. */
  drifted?: number;
};

export const equipmentLedgerReport: ReportMeta = {
  slug: "equipment-ledger",
  title: "Equipment Ledger",
  description:
    "Every product's containers and equipment: where they are now, and how many were lost or damaged, with customers or at the station. Figures come from the equipment ledger.",
};

const ledgerText = (row: BalanceSheetRow) => {
  if (row.productId === null) {
    return row.drifted ? `${row.drifted} drifted` : "All match";
  }
  if (row.matchesLedger) return "Matches";
  const l = row.ledger;
  return `Drifted: ledger has station ${l.stationStock}, customers ${l.customerOwed}, damaged ${l.scrapDamaged}, lost ${l.scrapLost}`;
};

export const balanceSheetTable: ReportTableDefinition<BalanceSheetRow> = {
  heading: "Balance Sheet",
  columns: [
    { header: "Product", value: (row) => row.productName },
    { header: "In Station", value: (row) => row.stationStock, align: "right" },
    { header: "With Customers", value: (row) => row.customerOwed, align: "right" },
    { header: "Damaged", value: (row) => row.scrapDamaged, align: "right" },
    { header: "Lost", value: (row) => row.scrapLost, align: "right" },
    { header: "Total Fleet", value: (row) => row.totalFleet, align: "right" },
    { header: "Ledger", value: ledgerText },
  ],
  emptyMessage: "No products yet.",
};

type LossesTableRow = Omit<LossesRow, "productId"> & { productId: number | null };

export const lossesTable: ReportTableDefinition<LossesTableRow> = {
  heading: "Losses",
  columns: [
    { header: "Product", value: (row) => row.productName },
    { header: "Lost with Customers", value: (row) => row.lostWithCustomers, align: "right" },
    { header: "Lost at Station", value: (row) => row.lostAtStation, align: "right" },
    { header: "Damaged with Customers", value: (row) => row.damagedWithCustomers, align: "right" },
    { header: "Damaged at Station", value: (row) => row.damagedAtStation, align: "right" },
    { header: "Total", value: (row) => row.total, align: "right" },
  ],
  emptyMessage: "No products yet.",
};

/** The Equipment Ledger report's tables, by the `table` param its CSV route takes. */
export const EQUIPMENT_LEDGER_CSV_TABLES = {
  balance: { table: balanceSheetTable, name: "equipment-balance-sheet" },
  losses: { table: lossesTable, name: "equipment-losses" },
} as const;
export type EquipmentLedgerCsvTable = keyof typeof EQUIPMENT_LEDGER_CSV_TABLES;

const sum = <T>(rows: T[], pick: (row: T) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

/** The balance sheet and losses tables, each with a totals row. */
export const equipmentLedgerSections = (
  balance: BalanceRow[],
  losses: LossesRow[],
): {
  balance: ReportSection<BalanceSheetRow>;
  losses: ReportSection<LossesTableRow>;
} => ({
  balance: {
    table: balanceSheetTable,
    rows: balance,
    total: {
      productId: null,
      productName: "Total",
      stationStock: sum(balance, (r) => r.stationStock),
      customerOwed: sum(balance, (r) => r.customerOwed),
      scrapDamaged: sum(balance, (r) => r.scrapDamaged),
      scrapLost: sum(balance, (r) => r.scrapLost),
      totalFleet: sum(balance, (r) => r.totalFleet),
      ledger: { stationStock: 0, customerOwed: 0, scrapDamaged: 0, scrapLost: 0 },
      matchesLedger: balance.every((r) => r.matchesLedger),
      drifted: balance.filter((r) => !r.matchesLedger).length,
    },
  },
  losses: {
    table: lossesTable,
    rows: losses,
    total: {
      productId: null,
      productName: "Total",
      lostWithCustomers: sum(losses, (r) => r.lostWithCustomers),
      lostAtStation: sum(losses, (r) => r.lostAtStation),
      damagedWithCustomers: sum(losses, (r) => r.damagedWithCustomers),
      damagedAtStation: sum(losses, (r) => r.damagedAtStation),
      total: sum(losses, (r) => r.total),
    },
  },
});

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
  equipmentLedgerReport,
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
