import { subDays } from "date-fns";
import { beforeAll, describe, expect, it } from "vitest";
import {
  Customer,
  EquipmentLedgerEntry,
  Order,
} from "../../src/backend/models";
import { WALK_IN_CUSTOMER_NAME } from "../../src/backend/services/customer.service";
import { DashboardService } from "../../src/backend/services/dashboard.service";
import {
  DEFAULT_INACTIVE_DAYS,
  parseMinDays,
  ReportService,
} from "../../src/backend/services/report.service";
import {
  CustomerStatus,
  LedgerAccountType,
  OrderStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

// Noon on Sep 1 in Manila.
const NOW = new Date("2026-09-01T04:00:00Z");

const makeCustomer = (name: string, status: CustomerStatus = CustomerStatus.ACTIVE) =>
  Customer.create({
    name: `RPT ${name}`,
    address: "1 Report St",
    barangayId: "034903002",
    status,
  });

const makeOrder = (
  customerId: number,
  createdAt: Date,
  status: OrderStatus = OrderStatus.DELIVERED,
) => Order.create({ customerId, createdBy: 1, status, createdAt });

const ledger = (
  customerId: number,
  productId: number,
  from: LedgerAccountType,
  to: LedgerAccountType,
  quantity: number,
  createdAt: Date,
) =>
  EquipmentLedgerEntry.create({
    productId,
    fromAccountType: from,
    fromAccountId: from === LedgerAccountType.STATION ? null : customerId,
    toAccountType: to,
    toAccountId: to === LedgerAccountType.STATION ? null : customerId,
    quantity,
    loggedBy: 1,
    createdAt,
  });

const { STATION, CUSTOMER, CUSTOMER_TEMP } = LedgerAccountType;

describe("Integration - Report Service", () => {
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    await setupTestDatabase();

    for (const name of [
      "Idle",
      "CancelledRecently",
      "Recent",
      "Never",
      "LateLastNight",
      "IdleWithEquipment",
      "IdleTempOnly",
      "RecentWithEquipment",
      "NeverWithEquipment",
      "Borrower",
    ]) {
      ids[name] = (await makeCustomer(name)).customerId;
    }
    ids.Deactivated = (
      await makeCustomer("Deactivated", CustomerStatus.INACTIVE)
    ).customerId;

    await makeOrder(ids.Idle, subDays(NOW, 40));
    await makeOrder(ids.Idle, subDays(NOW, 45));
    await makeOrder(ids.CancelledRecently, subDays(NOW, 40));
    await makeOrder(ids.CancelledRecently, subDays(NOW, 2), OrderStatus.CANCELLED);
    await makeOrder(ids.Recent, subDays(NOW, 5));
    // 11:30 PM on Aug 31 in Manila: 12.5 hours ago, but yesterday.
    await makeOrder(ids.LateLastNight, new Date("2026-08-31T15:30:00Z"));
    await makeOrder(ids.Deactivated, subDays(NOW, 90));
    await makeOrder(ids.IdleWithEquipment, subDays(NOW, 60));
    await makeOrder(ids.IdleTempOnly, subDays(NOW, 60));
    await makeOrder(ids.RecentWithEquipment, subDays(NOW, 1));
    await makeOrder(ids.Borrower, subDays(NOW, 1));

    await ledger(ids.IdleWithEquipment, 1, STATION, CUSTOMER, 3, subDays(NOW, 70));
    await ledger(ids.IdleWithEquipment, 2, STATION, CUSTOMER, 1, subDays(NOW, 70));
    await ledger(ids.IdleWithEquipment, 1, CUSTOMER, STATION, 1, subDays(NOW, 65));
    await ledger(ids.IdleTempOnly, 1, STATION, CUSTOMER_TEMP, 2, subDays(NOW, 60));
    await ledger(ids.RecentWithEquipment, 1, STATION, CUSTOMER, 2, subDays(NOW, 30));
    await ledger(ids.NeverWithEquipment, 1, STATION, CUSTOMER, 1, subDays(NOW, 10));

    // Lent 2 on day -20 and 3 on day -10, then 3 came back: the first loan is
    // closed and 2 of the second are still out.
    await ledger(ids.Borrower, 1, STATION, CUSTOMER_TEMP, 2, subDays(NOW, 20));
    await ledger(ids.Borrower, 1, STATION, CUSTOMER_TEMP, 3, subDays(NOW, 10));
    await ledger(ids.Borrower, 1, CUSTOMER_TEMP, STATION, 3, subDays(NOW, 5));
  });

  const byName = <T extends { customerName: string }>(rows: T[]) =>
    new Map(rows.map((row) => [row.customerName.replace("RPT ", ""), row]));

  describe("Inactive customers", () => {
    it("should list customers with no order in the period", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomers({ minDays: 30, now: NOW }),
      );

      expect(rows.get("Idle")).toMatchObject({ daysSinceLastOrder: 40 });
      expect(rows.has("Recent")).toBe(false);
    });

    it("should not count a cancelled order as ordering", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomers({ minDays: 30, now: NOW }),
      );
      expect(rows.get("CancelledRecently")).toMatchObject({
        daysSinceLastOrder: 40,
      });
    });

    it("should include customers who have never ordered", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomers({ minDays: 30, now: NOW }),
      );
      expect(rows.get("Never")).toMatchObject({
        lastOrderAt: null,
        daysSinceLastOrder: null,
      });
    });

    it("should leave out deactivated customers and the walk-in account", async () => {
      const rows = await ReportService.getInactiveCustomers({
        minDays: 0,
        now: NOW,
      });
      const names = rows.map((row) => row.customerName);
      expect(names).not.toContain("RPT Deactivated");
      expect(names).not.toContain(WALK_IN_CUSTOMER_NAME);
    });

    it("should count Philippine calendar days", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomers({ minDays: 1, now: NOW }),
      );
      expect(rows.get("LateLastNight")).toMatchObject({ daysSinceLastOrder: 1 });
    });

    it("should match the dashboard card that links to it", async () => {
      for (const now of [NOW, new Date("2026-08-31T16:10:00Z")]) {
        const { noRecentOrder, churnDays } =
          await DashboardService.getCustomerActivity(now);
        const rows = await ReportService.getInactiveCustomers({
          minDays: churnDays,
          now,
        });
        expect(rows.filter((row) => row.lastOrderAt !== null).length).toBe(
          noRecentOrder,
        );
      }
    });

    it("should list the longest idle first and never-ordered last", async () => {
      const rows = await ReportService.getInactiveCustomers({
        minDays: 0,
        now: NOW,
      });
      const days = rows.map((row) => row.daysSinceLastOrder);
      const firstNever = days.indexOf(null);

      expect(firstNever).toBeGreaterThan(0);
      expect(days.slice(firstNever).every((d) => d === null)).toBe(true);
      const ordered = days.slice(0, firstNever) as number[];
      expect(ordered).toEqual([...ordered].sort((a, b) => b - a));
    });
  });

  describe("Inactive customers with equipment", () => {
    it("should list inactive customers holding regular equipment", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomersWithEquipment({
          minDays: 30,
          now: NOW,
        }),
      );

      const idle = rows.get("IdleWithEquipment");
      expect(idle?.daysSinceLastOrder).toBe(60);
      expect(idle?.totalHeld).toBe(3);
      expect(idle?.equipment.map((e) => [e.productId, e.quantity])).toEqual([
        [1, 2],
        [2, 1],
      ]);
      expect(rows.get("NeverWithEquipment")).toMatchObject({
        lastOrderAt: null,
        totalHeld: 1,
      });
    });

    it("should leave out active customers, customers with nothing out, and temporary equipment", async () => {
      const rows = byName(
        await ReportService.getInactiveCustomersWithEquipment({
          minDays: 30,
          now: NOW,
        }),
      );
      expect(rows.has("RecentWithEquipment")).toBe(false);
      expect(rows.has("Idle")).toBe(false);
      expect(rows.has("IdleTempOnly")).toBe(false);
    });
  });

  describe("Temporary equipment", () => {
    it("should date the oldest unit still out, first in first out", async () => {
      const rows = byName(await ReportService.getTemporaryEquipment({ now: NOW }));

      expect(rows.get("Borrower")).toMatchObject({
        productId: 1,
        quantity: 2,
        daysHeld: 10,
      });
      expect(rows.get("IdleTempOnly")).toMatchObject({
        quantity: 2,
        daysHeld: 60,
      });
    });

    it("should list only customers holding temporary equipment, longest first", async () => {
      const rows = await ReportService.getTemporaryEquipment({ now: NOW });

      expect(rows.every((row) => row.quantity > 0)).toBe(true);
      expect(rows.map((r) => r.customerName)).not.toContain(
        "RPT IdleWithEquipment",
      );
      const held = rows.map((row) => row.daysHeld ?? -1);
      expect(held).toEqual([...held].sort((a, b) => b - a));
    });
  });

  describe("Days parameter", () => {
    it.each([
      [undefined, DEFAULT_INACTIVE_DAYS],
      ["", DEFAULT_INACTIVE_DAYS],
      ["abc", DEFAULT_INACTIVE_DAYS],
      ["-3", DEFAULT_INACTIVE_DAYS],
      ["2.5", DEFAULT_INACTIVE_DAYS],
      ["0", 0],
      ["14", 14],
      [["7", "30"], 7],
    ])("should read %j as %d", (value, expected) => {
      expect(parseMinDays(value)).toBe(expected);
    });
  });
});
