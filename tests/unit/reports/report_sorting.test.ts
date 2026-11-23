import { describe, expect, it } from "vitest";
import type { InactiveCustomerRow } from "../../../src/backend/services/report.service";
import {
  barangayOptions,
  describeSort,
  filterByBarangays,
  inactiveCustomersReport,
  inactiveWithEquipmentReport,
  parseBarangays,
  parseReportSort,
  sortReportRows,
} from "../../../src/features/reports/definitions";
import { inactiveReportView } from "../../../src/features/reports/inactive";

const row = (
  name: string,
  overrides: Partial<InactiveCustomerRow> = {},
): InactiveCustomerRow => ({
  customerId: name.length,
  customerName: name,
  phone: null,
  address: null,
  barangayId: null,
  barangay: null,
  customerSince: new Date("2026-01-01T04:00:00Z"),
  lastOrderAt: null,
  daysSinceLastOrder: null,
  ...overrides,
});

const ADUAS = { barangayId: "034903002", barangay: "Aduas Centro (Aduas)" };
const SIKAT = { barangayId: "034903003", barangay: "Bagong Sikat" };

const rows = [
  row("Carla", { ...SIKAT, daysSinceLastOrder: 40, lastOrderAt: new Date("2026-10-01") }),
  row("ana", { ...ADUAS, daysSinceLastOrder: 90, lastOrderAt: new Date("2026-08-01") }),
  row("Ben"),
  row("Dino", { ...SIKAT, daysSinceLastOrder: 40, lastOrderAt: new Date("2026-10-01") }),
];
const names = (list: InactiveCustomerRow[]) => list.map((r) => r.customerName);
const table = inactiveCustomersReport;

describe("Unit - Report Sorting and Filtering", () => {
  describe("parseReportSort", () => {
    it("should take a sortable column and either order, in any case", () => {
      expect(parseReportSort(table, "barangay", "desc")).toEqual({
        key: "barangay",
        order: "DESC",
      });
      expect(parseReportSort(table, ["daysSince"], "ASC")).toEqual({
        key: "daysSince",
        order: "ASC",
      });
    });

    it("should sort ascending when the order is missing or unknown", () => {
      expect(parseReportSort(table, "customer", undefined)?.order).toBe("ASC");
      expect(parseReportSort(table, "customer", "sideways")?.order).toBe("ASC");
    });

    it("should ignore a column the table can't sort by", () => {
      for (const sort of [undefined, "", "nope", "constructor", "equipment"]) {
        expect(parseReportSort(table, sort, "ASC")).toBeNull();
      }
      expect(parseReportSort(inactiveWithEquipmentReport, "equipment", "ASC")).not.toBeNull();
    });

    it("should let every column of both inactive reports be sorted", () => {
      for (const report of [inactiveCustomersReport, inactiveWithEquipmentReport]) {
        expect(report.columns.every((column) => column.sort)).toBe(true);
        const keys = report.columns.map((column) => column.sort!.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    });
  });

  describe("sortReportRows", () => {
    it("should leave the rows in their own order when not sorted", () => {
      expect(sortReportRows(table, rows, null)).toBe(rows);
    });

    it("should sort text without regard to case", () => {
      expect(names(sortReportRows(table, rows, { key: "customer", order: "ASC" }))).toEqual(
        ["ana", "Ben", "Carla", "Dino"],
      );
      expect(names(sortReportRows(table, rows, { key: "customer", order: "DESC" }))).toEqual(
        ["Dino", "Carla", "Ben", "ana"],
      );
    });

    it("should put blanks last either way, and keep ties in their order", () => {
      expect(names(sortReportRows(table, rows, { key: "barangay", order: "ASC" }))).toEqual(
        ["ana", "Carla", "Dino", "Ben"],
      );
      expect(names(sortReportRows(table, rows, { key: "barangay", order: "DESC" }))).toEqual(
        ["Carla", "Dino", "ana", "Ben"],
      );
    });

    it("should sort numbers and dates by value, with never-ordered last", () => {
      expect(names(sortReportRows(table, rows, { key: "daysSince", order: "ASC" }))).toEqual(
        ["Carla", "Dino", "ana", "Ben"],
      );
      expect(names(sortReportRows(table, rows, { key: "lastOrder", order: "DESC" }))).toEqual(
        ["Carla", "Dino", "ana", "Ben"],
      );
    });

    it("should not change the rows it was given", () => {
      const before = names(rows);
      sortReportRows(table, rows, { key: "customer", order: "ASC" });
      expect(names(rows)).toEqual(before);
    });
  });

  describe("barangays", () => {
    it("should read the repeated param, dropping blanks and repeats", () => {
      expect(parseBarangays(undefined)).toEqual([]);
      expect(parseBarangays("")).toEqual([]);
      expect(parseBarangays("034903002")).toEqual(["034903002"]);
      expect(parseBarangays(["034903002", "", "034903002", "034903003"])).toEqual([
        "034903002",
        "034903003",
      ]);
    });

    it("should keep the rows in any barangay picked, or all when none is", () => {
      expect(filterByBarangays(rows, [])).toBe(rows);
      expect(names(filterByBarangays(rows, ["034903003"]))).toEqual(["Carla", "Dino"]);
      expect(names(filterByBarangays(rows, ["034903002", "034903003"]))).toEqual([
        "Carla",
        "ana",
        "Dino",
      ]);
    });

    it("should offer the barangays in the report by name, with their counts", () => {
      expect(barangayOptions(rows)).toEqual([
        { code: "034903002", name: "Aduas Centro (Aduas)", count: 1 },
        { code: "034903003", name: "Bagong Sikat", count: 2 },
      ]);
    });
  });

  describe("inactiveReportView", () => {
    it("should filter, then sort, and carry both to the printout and the CSV", () => {
      const view = inactiveReportView(table, rows, 30, {
        sort: "customer",
        order: "DESC",
        barangay: ["034903002", "034903003"],
      });

      expect(names(view.rows)).toEqual(["Dino", "Carla", "ana"]);
      expect(view.query).toBe(
        "days=30&sort=customer&order=DESC&barangay=034903002&barangay=034903003",
      );
      expect(view.filterLines).toEqual([
        "Barangays: Aduas Centro (Aduas), Bagong Sikat",
        "Sorted by Customer, descending",
      ]);
    });

    it("should still offer a barangay picked that no longer has anyone in the report", () => {
      const view = inactiveReportView(table, rows, 30, { barangay: "034903005" });

      expect(view.rows).toEqual([]);
      expect(view.barangayOptions).toContainEqual({
        code: "034903005",
        name: "Bagong Buhay",
        count: 0,
      });
      expect(view.filterLines).toEqual(["Barangay: Bagong Buhay"]);
    });

    it("should leave the query at just the days when nothing else is chosen", () => {
      const view = inactiveReportView(table, rows, 30, {});
      expect(view.query).toBe("days=30");
      expect(view.rows).toBe(rows);
      expect(view.filterLines).toEqual([]);
      expect(describeSort(table, null)).toBeNull();
    });
  });
});
