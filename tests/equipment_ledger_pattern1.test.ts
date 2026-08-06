import { beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { CustomerEquipmentBalance } from "../src/backend/models/CustomerEquipmentBalance";
import { EquipmentLedgerEntry } from "../src/backend/models/EquipmentLedgerEntry";
import { ProductInventory } from "../src/backend/models/ProductInventory";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { InventoryService } from "../src/backend/services/inventory.service";
import {
  InventoryAdjustmentType,
  LedgerAccountType,
  LedgerReferenceType,
} from "../src/lib/definitions";

describe("Pattern 1 Double-Entry Equipment Ledger & Reports TDD Suite", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should record ISSUE movement (STATION -> CUSTOMER) and update stock & customer balance", async () => {
    const product = await ProductInventory.create({
      name: `Ledger Issue Prod ${Date.now()}`,
      stockInStation: 50,
      stockWithCustomers: 10,
      unitPrice: 25,
    });

    const entry = await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.STATION,
      toAccountType: LedgerAccountType.CUSTOMER,
      toAccountId: 1,
      quantity: 5,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    expect(entry.entryId).toBeDefined();

    const updatedProd = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 1, productId: product.productId },
    });

    expect(updatedProd?.stockInStation).toBe(45);
    expect(updatedProd?.stockWithCustomers).toBe(15);
    expect(balance?.quantityOwed).toBe(5);
  });

  it("should record RETURNED movement (CUSTOMER -> STATION) and update balances", async () => {
    const product = await ProductInventory.create({
      name: `Ledger Return Prod ${Date.now()}`,
      stockInStation: 20,
      stockWithCustomers: 15,
      unitPrice: 25,
    });

    await CustomerEquipmentBalance.create({
      customerId: 2,
      productId: product.productId,
      quantityOwed: 10,
      quantityTemporaryOwed: 0,
    });

    const entry = await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER,
      fromAccountId: 2,
      toAccountType: LedgerAccountType.STATION,
      quantity: 4,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    expect(entry.entryId).toBeDefined();

    const updatedProd = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 2, productId: product.productId },
    });

    expect(updatedProd?.stockInStation).toBe(24);
    expect(updatedProd?.stockWithCustomers).toBe(11);
    expect(balance?.quantityOwed).toBe(6);
  });

  it("should record TEMPORARY movement (STATION -> CUSTOMER_TEMP) and TEMPORARY_RETURNED (CUSTOMER_TEMP -> STATION)", async () => {
    const product = await ProductInventory.create({
      name: `Ledger Temp Prod ${Date.now()}`,
      stockInStation: 30,
      stockWithCustomers: 0,
      unitPrice: 25,
    });

    // Issue Temporary
    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.STATION,
      toAccountType: LedgerAccountType.CUSTOMER_TEMP,
      toAccountId: 3,
      quantity: 3,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    let balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 3, productId: product.productId },
    });
    expect(balance?.quantityTemporaryOwed).toBe(3);

    // Return Temporary
    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER_TEMP,
      fromAccountId: 3,
      toAccountType: LedgerAccountType.STATION,
      quantity: 1,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 3, productId: product.productId },
    });
    expect(balance?.quantityTemporaryOwed).toBe(2);
  });

  it("should record STOCK_IN adjustment (SUPPLIER -> STATION)", async () => {
    const product = await ProductInventory.create({
      name: `Ledger Restock Prod ${Date.now()}`,
      stockInStation: 10,
      unitPrice: 25,
    });

    await InventoryService.createAdjustment({
      productId: product.productId,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 50,
      reason: "Supplier shipment",
    });

    const updatedProd = await ProductInventory.findByPk(product.productId);
    expect(updatedProd?.stockInStation).toBe(60);
  });

  it("should record SCRAP_DAMAGED and SCRAP_LOST movements", async () => {
    const product = await ProductInventory.create({
      name: `Ledger Scrap Prod ${Date.now()}`,
      stockInStation: 40,
      stockWithCustomers: 0,
      unitPrice: 25,
    });

    await InventoryService.createAdjustment({
      productId: product.productId,
      adjustmentType: InventoryAdjustmentType.DECLARED_DAMAGED,
      quantity: 2,
      reason: "Broken in station",
    });

    await InventoryService.createAdjustment({
      productId: product.productId,
      adjustmentType: InventoryAdjustmentType.DECLARED_LOST,
      quantity: 1,
      reason: "Missing from station",
    });

    const updatedProd = await ProductInventory.findByPk(product.productId);
    expect(updatedProd?.stockInStation).toBe(37);
    expect(updatedProd?.stockDamaged).toBe(2);
    expect(updatedProd?.stockLost).toBe(1);
  });

  it("should generate Balance Sheet, Customer Liability Aging, and Shrinkage Reports", async () => {
    const balanceSheet = await EquipmentService.getBalanceSheetReport();
    expect(Array.isArray(balanceSheet)).toBe(true);

    const agingReport = await EquipmentService.getCustomerLiabilityAgingReport();
    expect(Array.isArray(agingReport)).toBe(true);

    const shrinkageReport = await EquipmentService.getShrinkageRateReport();
    expect(Array.isArray(shrinkageReport)).toBe(true);
  });
});
