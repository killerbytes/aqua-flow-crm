import type {
  InactiveCustomerRow,
  InactiveCustomerWithEquipmentRow,
  TemporaryEquipmentRow,
} from "@/backend/services/report.service";
import { businessDateKey, BUSINESS_TIMEZONE } from "@/lib/business-time";
import { toCsv, type CsvValue } from "@/lib/csv";
import { formatInTimeZone } from "date-fns-tz";

/**
 * One column of a report. `value` is what the screen and the printout show;
 * `csv` overrides it for the download, so dates stay sortable in a spreadsheet.
 */
export interface ReportColumn<Row> {
  header: string;
  value: (row: Row) => string | number | null;
  csv?: (row: Row) => CsvValue;
  align?: "left" | "right";
  /** Screen only: where the cell links to. */
  href?: (row: Row) => string | undefined;
}

export interface ReportDefinition<Row> {
  slug: string;
  title: string;
  description: string;
  columns: ReportColumn<Row>[];
  emptyMessage: string;
}

export const formatReportDate = (date: Date | null) =>
  date ? formatInTimeZone(date, BUSINESS_TIMEZONE, "MMM d, yyyy") : null;

export const formatGeneratedAt = (date: Date) =>
  formatInTimeZone(date, BUSINESS_TIMEZONE, "MMM d, yyyy h:mm a");

const csvDate = (date: Date | null) => (date ? businessDateKey(date) : null);

const customerHref = (row: { customerId: number }) =>
  `/customers/${row.customerId}`;

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

/** The reports, in the order the sidebar and the reports page list them. */
export const REPORTS = [
  inactiveCustomersReport,
  inactiveWithEquipmentReport,
  temporaryEquipmentReport,
].map(({ slug, title, description }) => ({
  slug,
  title,
  description,
  href: `/reports/${slug}`,
}));

export const reportCsv = <Row>(
  report: ReportDefinition<Row>,
  rows: Row[],
) =>
  toCsv(
    report.columns.map((column) => column.header),
    rows.map((row) =>
      report.columns.map((column) =>
        column.csv ? column.csv(row) : column.value(row),
      ),
    ),
  );
