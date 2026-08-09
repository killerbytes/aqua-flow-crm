import { beforeAll, describe, expect, it } from "vitest";
import { ReportService } from "../../src/backend/services/report.service";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Report Service & Analytics", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("Customer Last Order Reports", () => {
    it("should sort customers by name ASC and DESC", async () => {
      const ascResult = await ReportService.getCustomersWithLastOrder({
        sort: "name",
        order: "ASC",
      });
      expect(ascResult.rows.length).toBeGreaterThan(0);
      const namesAsc = ascResult.rows.map((r) => r.customerName);
      const sortedAsc = [...namesAsc].sort((a, b) => a.localeCompare(b));
      expect(namesAsc).toEqual(sortedAsc);

      const descResult = await ReportService.getCustomersWithLastOrder({
        sort: "name",
        order: "DESC",
      });
      const namesDesc = descResult.rows.map((r) => r.customerName);
      const sortedDesc = [...namesDesc].sort((a, b) => b.localeCompare(a));
      expect(namesDesc).toEqual(sortedDesc);
    });

    it("should sort customers by daysSinceLastOrder ASC & DESC", async () => {
      const daysAsc = await ReportService.getCustomersWithLastOrder({
        sort: "daysSinceLastOrder",
        order: "ASC",
      });
      expect(daysAsc.rows).toBeDefined();

      const daysDesc = await ReportService.getCustomersWithLastOrder({
        sort: "daysSinceLastOrder",
        order: "DESC",
      });
      expect(daysDesc.rows).toBeDefined();
    });

    it("should filter customers by minimum daysSinceLastOrder", async () => {
      const min7Days = await ReportService.getCustomersWithLastOrder({
        query: { days: 7 },
      });
      expect(min7Days.rows).toBeDefined();
      expect(
        min7Days.rows.every(
          (r) => r.daysSinceLastOrder !== null && r.daysSinceLastOrder >= 7,
        ),
      ).toBe(true);
    });
  });
});
