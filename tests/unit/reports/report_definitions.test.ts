import { describe, expect, it } from "vitest";
import type {
  VoidRow,
  VoidUserRow,
} from "../../../src/backend/services/finance-report.service";
import type {
  InactiveCustomerRow,
  InactiveCustomerWithEquipmentRow,
} from "../../../src/backend/services/report.service";
import {
  collectionsTable,
  EQUIPMENT_LEDGER_CSV_TABLES,
  formatPeso,
  formatRange,
  formatReportDate,
  formatReportDateTime,
  inactiveCustomersReport,
  inactiveWithEquipmentReport,
  rangeQuery,
  receivablesReport,
  reportCsv,
  REPORTS,
  SALES_CSV_TABLES,
  salesByPeriodTable,
  temporaryEquipmentReport,
  VOIDS_CSV_TABLES,
  voidsByUserTable,
  voidsTable,
  type ReportTableDefinition,
} from "../../../src/features/reports/definitions";

// 01:30 on Nov 9 in Manila, but still Nov 8 in UTC.
const AFTER_MIDNIGHT_MANILA = new Date("2026-11-08T17:30:00Z");

/** What the screen and the printout show for one row. */
const onScreen = <Row>(table: ReportTableDefinition<Row>, row: Row) =>
  Object.fromEntries(table.columns.map((c) => [c.header, c.value(row)]));

const csvLines = <Row>(
  table: ReportTableDefinition<Row>,
  rows: Row[],
  total?: Row,
) => reportCsv(table, rows, total).split("\r\n");

const inactive: InactiveCustomerRow = {
  customerId: 7,
  customerName: "Cruz, Juan",
  phone: "09171234567",
  address: "12 Mabini St",
  barangayId: "034903003",
  barangay: "Bagong Sikat",
  customerSince: new Date("2026-01-15T02:00:00Z"),
  lastOrderAt: AFTER_MIDNIGHT_MANILA,
  daysSinceLastOrder: 12,
};

describe("Unit - Report Definitions", () => {
  describe("reportCsv", () => {
    const row = { label: "Mon, Nov 9, 2026", orders: 2, units: 5, sales: 1234.5 };
    const total = { label: "Total", orders: 2, units: 5, sales: 1234.5 };

    it("should write the headers, then the rows, then the totals row", () => {
      expect(csvLines(salesByPeriodTable, [row], total)).toEqual([
        "Period,Orders,Units,Sales",
        '"Mon, Nov 9, 2026",2,5,1234.5',
        "Total,2,5,1234.5",
      ]);
    });

    it("should write only the headers for an empty report", () => {
      expect(reportCsv(salesByPeriodTable, [])).toBe("Period,Orders,Units,Sales");
    });

    it("should leave the totals row out when a report has none", () => {
      expect(csvLines(salesByPeriodTable, [row])).toHaveLength(2);
    });
  });

  describe("money columns", () => {
    const collection = {
      method: "Cash",
      payments: 3,
      fromOrders: 1500,
      fromInvoices: 0,
      total: 1500,
    };

    it("should show pesos on screen and plain numbers in the CSV", () => {
      expect(onScreen(collectionsTable, collection)).toMatchObject({
        "From Orders": "P1,500.00",
        "From Invoices": "P0.00",
        Total: "P1,500.00",
      });
      expect(csvLines(collectionsTable, [collection])[1]).toBe(
        "Cash,3,1500,0,1500",
      );
    });

    it("should leave a missing amount blank rather than P0.00", () => {
      expect(formatPeso(null)).toBeNull();
      expect(formatPeso(0)).toBe("P0.00");
    });

    it("should give every amount on the receivables report as a number", () => {
      const row = {
        customerId: 7,
        customerName: "Juan Cruz",
        phone: null,
        openInvoices: 1,
        unbilledOrders: 2,
        current: 100,
        days1to30: 200.5,
        days31to60: 0,
        days61to90: 0,
        over90: 50,
        total: 350.5,
      };

      expect(csvLines(receivablesReport, [row])[1]).toBe(
        "Juan Cruz,,1,2,100,200.5,0,0,50,350.5",
      );
      expect(onScreen(receivablesReport, row)["Total Owed"]).toBe("P350.50");
    });
  });

  describe("dates", () => {
    it("should show Philippine dates on screen and sortable ones in the CSV", () => {
      expect(onScreen(inactiveCustomersReport, inactive)).toMatchObject({
        "Last Order": "Nov 9, 2026",
        "Customer Since": "Jan 15, 2026",
      });
      expect(csvLines(inactiveCustomersReport, [inactive])[1]).toBe(
        '"Cruz, Juan",09171234567,12 Mabini St,Bagong Sikat,2026-11-09,12,2026-01-15',
      );
    });

    it("should say so when a customer has never ordered", () => {
      const never = { ...inactive, lastOrderAt: null, daysSinceLastOrder: null };

      expect(onScreen(inactiveCustomersReport, never)["Last Order"]).toBe(
        "Never ordered",
      );
      expect(csvLines(inactiveCustomersReport, [never])[1]).toContain(
        ",Never ordered,,",
      );
    });

    it("should say Unknown when the ledger has no record of a loan", () => {
      const loan = {
        customerId: 7,
        customerName: "Juan Cruz",
        phone: null,
        productId: 1,
        productName: "Slim",
        quantity: 2,
        givenAt: null,
        daysHeld: null,
      };

      expect(onScreen(temporaryEquipmentReport, loan).Given).toBe("Unknown");
      expect(csvLines(temporaryEquipmentReport, [loan])[1]).toBe(
        "Juan Cruz,,Slim,2,Unknown,",
      );
    });

    it("should give the time of a void in Philippine time", () => {
      const row: VoidRow = {
        at: AFTER_MIDNIGHT_MANILA,
        type: "Order voided",
        reference: "Order #12",
        customerName: "Juan Cruz",
        amount: 350,
        by: "Maria",
        byUserId: 2,
        byRole: "MANAGER",
        reason: "Entered twice",
      };

      expect(onScreen(voidsTable, row).When).toBe("Nov 9, 2026 1:30 AM");
      expect(csvLines(voidsTable, [row])[1]).toBe(
        "2026-11-09 01:30,Order voided,Order #12,Juan Cruz,350,Maria,Entered twice",
      );
    });

    it("should format dates for headings, and nothing for a missing date", () => {
      expect(formatReportDate(AFTER_MIDNIGHT_MANILA)).toBe("Nov 9, 2026");
      expect(formatReportDateTime(AFTER_MIDNIGHT_MANILA)).toBe(
        "Nov 9, 2026 1:30 AM",
      );
      expect(formatReportDate(null)).toBeNull();
      expect(formatReportDateTime(null)).toBeNull();
    });

    it("should describe a range, or a single day", () => {
      expect(formatRange("2026-11-01", "2026-11-09")).toBe(
        "Nov 1, 2026 – Nov 9, 2026",
      );
      expect(formatRange("2026-11-09", "2026-11-09")).toBe("Nov 9, 2026");
    });
  });

  describe("other columns", () => {
    it("should list held equipment, without the × sign in the CSV", () => {
      const row: InactiveCustomerWithEquipmentRow = {
        ...inactive,
        equipment: [
          { productId: 1, productName: "Slim", quantity: 2 },
          { productId: 2, productName: "Round", quantity: 1 },
        ],
        totalHeld: 3,
      };

      expect(onScreen(inactiveWithEquipmentReport, row)).toMatchObject({
        "Equipment Held": "Slim × 2, Round × 1",
        "Total Units": 3,
      });
      expect(csvLines(inactiveWithEquipmentReport, [row])[1]).toMatch(
        /,Slim x 2; Round x 1,3$/,
      );
    });

    it("should name a user's role, and leave the totals row's blank", () => {
      const row: VoidUserRow = {
        by: "Maria",
        role: "MANAGER",
        ordersVoided: 2,
        ordersVoidedAmount: 700,
        invoicesVoided: 0,
        paymentsReversed: 1,
      };

      expect(onScreen(voidsByUserTable, row).Role).toBe("Manager");
      expect(onScreen(voidsByUserTable, { ...row, role: null }).Role).toBeNull();
      expect(csvLines(voidsByUserTable, [row])[1]).toBe("Maria,Manager,2,700,0,1");
    });

    it("should link a customer's name to their page, when there is one", () => {
      const [name] = receivablesReport.columns;
      expect(name.href?.({ customerId: 7 } as never)).toBe("/customers/7");
      expect(name.href?.({ customerId: null } as never)).toBeUndefined();
    });
  });

  describe("the report list", () => {
    it("should give every report its own page under /reports", () => {
      const hrefs = REPORTS.map((report) => report.href);

      expect(hrefs).toEqual(REPORTS.map((report) => `/reports/${report.slug}`));
      expect(new Set(hrefs).size).toBe(REPORTS.length);
      for (const report of REPORTS) {
        expect(report.title).toBeTruthy();
        expect(report.description).toBeTruthy();
      }
    });

    it("should name each downloadable table differently", () => {
      const names = [
        SALES_CSV_TABLES,
        VOIDS_CSV_TABLES,
        EQUIPMENT_LEDGER_CSV_TABLES,
      ].flatMap((tables) => Object.values(tables).map((table) => table.name));

      expect(new Set(names).size).toBe(names.length);
    });

    it("should carry a date range and the table into the download link", () => {
      const range = { from: "2026-11-01", to: "2026-11-09" };

      expect(rangeQuery(range)).toBe("from=2026-11-01&to=2026-11-09");
      expect(rangeQuery(range, { table: "products" })).toBe(
        "from=2026-11-01&to=2026-11-09&table=products",
      );
    });
  });
});
