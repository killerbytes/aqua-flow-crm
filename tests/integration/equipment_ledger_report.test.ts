import { subDays } from "date-fns";
import { beforeAll, describe, expect, it } from "vitest";
import {
  Customer,
  EquipmentLedgerEntry,
  Order,
  ProductInventory,
} from "../../src/backend/models";
import { EquipmentService } from "../../src/backend/services/equipment.service";
import { equipmentLedgerSections } from "../../src/features/reports/definitions";
import {
  CustomerStatus,
  LedgerAccountType,
  OrderStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const { SUPPLIER, STATION, CUSTOMER, CUSTOMER_TEMP, SCRAP_LOST, SCRAP_DAMAGED } =
  LedgerAccountType;
const isCustomer = (type: LedgerAccountType) =>
  type === CUSTOMER || type === CUSTOMER_TEMP;

// Noon, Sep 15 2026 in Manila.
const NOW = new Date("2026-09-15T04:00:00Z");

const move = (
  productId: number,
  from: LedgerAccountType,
  to: LedgerAccountType,
  quantity: number,
  customerId: number | null = null,
  createdAt: Date = NOW,
) =>
  EquipmentLedgerEntry.create({
    productId,
    fromAccountType: from,
    fromAccountId: isCustomer(from) ? customerId : null,
    toAccountType: to,
    toAccountId: isCustomer(to) ? customerId : null,
    quantity,
    loggedBy: 1,
    createdAt,
  });

const newCustomer = (name: string) =>
  Customer.create({
    name: `LEDGER ${name}`,
    address: "1 Ledger St",
    barangayId: "034903002",
    status: CustomerStatus.ACTIVE,
  });

describe("Integration - Equipment Ledger Report", () => {
  let productId: number;
  let customerId: number;

  beforeAll(async () => {
    await setupTestDatabase();
    productId = (await ProductInventory.create({ name: "Ledger Jug", unitPrice: 10 }))
      .productId;
    customerId = (await newCustomer("Holder")).customerId;

    await move(productId, SUPPLIER, STATION, 10);
    await move(productId, STATION, CUSTOMER, 4, customerId);
    await move(productId, STATION, CUSTOMER_TEMP, 2, customerId);
    await move(productId, CUSTOMER, SCRAP_LOST, 1, customerId);
    await move(productId, CUSTOMER_TEMP, SCRAP_DAMAGED, 1, customerId);
    // Inventory adjustments: written off at the station.
    await move(productId, STATION, SCRAP_LOST, 2);
    await move(productId, STATION, SCRAP_DAMAGED, 1);
  });

  describe("Losses", () => {
    it("should split losses with customers from write-offs at the station", async () => {
      const row = (await EquipmentService.getLossesReport()).find(
        (r) => r.productId === productId,
      );

      expect(row).toEqual({
        productId,
        productName: "Ledger Jug",
        lostWithCustomers: 1,
        lostAtStation: 2,
        damagedWithCustomers: 1,
        damagedAtStation: 1,
        total: 5,
      });
    });

    it("should agree with the stored lost and damaged totals", async () => {
      const [losses, balance] = await Promise.all([
        EquipmentService.getLossesReport(),
        EquipmentService.getBalanceSheetReport(),
      ]);
      for (const row of balance.filter((r) => r.matchesLedger)) {
        const loss = losses.find((l) => l.productId === row.productId)!;
        expect(loss.lostWithCustomers + loss.lostAtStation).toBe(row.scrapLost);
        expect(loss.damagedWithCustomers + loss.damagedAtStation).toBe(row.scrapDamaged);
      }
    });
  });

  describe("Balance sheet", () => {
    it("should add up each account from the ledger in one pass", async () => {
      const row = (await EquipmentService.getBalanceSheetReport()).find(
        (r) => r.productId === productId,
      );

      expect(row).toMatchObject({
        stationStock: 1,
        customerOwed: 4,
        scrapDamaged: 2,
        scrapLost: 3,
        totalFleet: 10,
        ledger: { stationStock: 1, customerOwed: 4, scrapDamaged: 2, scrapLost: 3 },
        matchesLedger: true,
      });
    });

    it("should total the tables and count drifted products", async () => {
      const [balance, losses] = await Promise.all([
        EquipmentService.getBalanceSheetReport(),
        EquipmentService.getLossesReport(),
      ]);
      const drifting = { ...balance[0], matchesLedger: false };
      const sections = equipmentLedgerSections([drifting, ...balance.slice(1)], losses);

      expect(sections.balance.total).toMatchObject({
        productName: "Total",
        totalFleet: balance.reduce((sum, r) => sum + r.totalFleet, 0),
        drifted: 1,
      });
      expect(sections.losses.total?.total).toBe(
        losses.reduce((sum, r) => sum + r.total, 0),
      );
      expect(sections.balance.table.columns.at(-1)?.value(sections.balance.total!)).toBe(
        "1 drifted",
      );
    });
  });

  describe("Days idle", () => {
    const daysIdleFor = async (id: number) =>
      (await EquipmentService.getCustomerLiabilityAgingReport(NOW)).find(
        (row) => row.customerId === id && row.productId === productId,
      )?.daysIdle;

    it("should not count a cancelled order as activity", async () => {
      const id = (await newCustomer("Cancelled")).customerId;
      await move(productId, STATION, CUSTOMER, 1, id, subDays(NOW, 30));
      await Order.create({
        customerId: id,
        createdBy: 1,
        status: OrderStatus.DELIVERED,
        createdAt: subDays(NOW, 20),
      });
      await Order.create({
        customerId: id,
        createdBy: 1,
        status: OrderStatus.CANCELLED,
        createdAt: subDays(NOW, 2),
      });

      expect(await daysIdleFor(id)).toBe(20);
    });

    it("should count from the latest order or movement, whichever is later", async () => {
      const id = (await newCustomer("Active")).customerId;
      await move(productId, STATION, CUSTOMER, 1, id, subDays(NOW, 30));
      expect(await daysIdleFor(id)).toBe(30);

      await Order.create({
        customerId: id,
        createdBy: 1,
        status: OrderStatus.PENDING,
        createdAt: subDays(NOW, 3),
      });
      expect(await daysIdleFor(id)).toBe(3);
    });
  });
});
