import { beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { CustomerEquipmentBalance } from "../src/backend/models/CustomerEquipmentBalance";
import { EquipmentLedgerEntry } from "../src/backend/models/EquipmentLedgerEntry";
import { ProductInventory } from "../src/backend/models/ProductInventory";
import { LedgerAccountType, LedgerReferenceType } from "../src/lib/definitions";

describe("EquipmentLedgerEntry afterCreate Hook Coverage Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should process ISSUE action correctly (quantityOwed & station stock)", async () => {
    const product = await ProductInventory.create({
      name: `Test Issue Prod ${Date.now()}`,
      stockInStation: 50,
      stockWithCustomers: 10,
      unitPrice: 20,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.STATION,
      toAccountType: LedgerAccountType.CUSTOMER,
      toAccountId: 1,
      quantity: 5,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 1, productId: product.productId },
    });

    expect(updatedProduct?.stockInStation).toBe(45);
    expect(updatedProduct?.stockWithCustomers).toBe(15);
    expect(balance?.quantityOwed).toBe(5);
    expect(balance?.quantityTemporaryOwed).toBe(0);
  });

  it("should process TEMPORARY action correctly (quantityTemporaryOwed & station stock)", async () => {
    const product = await ProductInventory.create({
      name: `Test Temp Prod ${Date.now()}`,
      stockInStation: 40,
      stockWithCustomers: 5,
      unitPrice: 20,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.STATION,
      toAccountType: LedgerAccountType.CUSTOMER_TEMP,
      toAccountId: 1,
      quantity: 4,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 1, productId: product.productId },
    });

    expect(updatedProduct?.stockInStation).toBe(36);
    expect(updatedProduct?.stockWithCustomers).toBe(9);
    expect(balance?.quantityOwed).toBe(0);
    expect(balance?.quantityTemporaryOwed).toBe(4);
  });

  it("should process RETURNED action correctly", async () => {
    const product = await ProductInventory.create({
      name: `Test Returned Prod ${Date.now()}`,
      stockInStation: 20,
      stockWithCustomers: 10,
      unitPrice: 20,
    });

    await CustomerEquipmentBalance.create({
      customerId: 2,
      productId: product.productId,
      quantityOwed: 8,
      quantityTemporaryOwed: 0,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER,
      fromAccountId: 2,
      toAccountType: LedgerAccountType.STATION,
      quantity: 3,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 2, productId: product.productId },
    });

    expect(updatedProduct?.stockInStation).toBe(23);
    expect(updatedProduct?.stockWithCustomers).toBe(7);
    expect(balance?.quantityOwed).toBe(5);
  });

  it("should process TEMPORARY_RETURNED action correctly", async () => {
    const product = await ProductInventory.create({
      name: `Test Temp Returned Prod ${Date.now()}`,
      stockInStation: 20,
      stockWithCustomers: 10,
      unitPrice: 20,
    });

    await CustomerEquipmentBalance.create({
      customerId: 2,
      productId: product.productId,
      quantityOwed: 0,
      quantityTemporaryOwed: 6,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER_TEMP,
      fromAccountId: 2,
      toAccountType: LedgerAccountType.STATION,
      quantity: 2,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 2, productId: product.productId },
    });

    expect(updatedProduct?.stockInStation).toBe(22);
    expect(updatedProduct?.stockWithCustomers).toBe(8);
    expect(balance?.quantityTemporaryOwed).toBe(4);
  });

  it("should process LOST and DAMAGED actions correctly", async () => {
    const product = await ProductInventory.create({
      name: `Test Lost Damaged Prod ${Date.now()}`,
      stockInStation: 10,
      stockWithCustomers: 20,
      stockLost: 0,
      stockDamaged: 0,
      unitPrice: 20,
    });

    await CustomerEquipmentBalance.create({
      customerId: 3,
      productId: product.productId,
      quantityOwed: 10,
      quantityTemporaryOwed: 0,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER,
      fromAccountId: 3,
      toAccountType: LedgerAccountType.SCRAP_LOST,
      quantity: 2,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER,
      fromAccountId: 3,
      toAccountType: LedgerAccountType.SCRAP_DAMAGED,
      quantity: 1,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 3, productId: product.productId },
    });

    expect(updatedProduct?.stockWithCustomers).toBe(17);
    expect(updatedProduct?.stockLost).toBe(2);
    expect(updatedProduct?.stockDamaged).toBe(1);
    expect(balance?.quantityOwed).toBe(7);
  });

  it("should process TEMPORARY_LOST and TEMPORARY_DAMAGED actions correctly", async () => {
    const product = await ProductInventory.create({
      name: `Test Temp Lost Damaged Prod ${Date.now()}`,
      stockInStation: 10,
      stockWithCustomers: 20,
      stockLost: 0,
      stockDamaged: 0,
      unitPrice: 20,
    });

    await CustomerEquipmentBalance.create({
      customerId: 3,
      productId: product.productId,
      quantityOwed: 0,
      quantityTemporaryOwed: 10,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER_TEMP,
      fromAccountId: 3,
      toAccountType: LedgerAccountType.SCRAP_LOST,
      quantity: 3,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    await EquipmentLedgerEntry.create({
      productId: product.productId,
      fromAccountType: LedgerAccountType.CUSTOMER_TEMP,
      fromAccountId: 3,
      toAccountType: LedgerAccountType.SCRAP_DAMAGED,
      quantity: 2,
      referenceType: LedgerReferenceType.MANUAL_LOG,
      loggedBy: 1,
    });

    const updatedProduct = await ProductInventory.findByPk(product.productId);
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: 3, productId: product.productId },
    });

    expect(updatedProduct?.stockWithCustomers).toBe(15);
    expect(updatedProduct?.stockLost).toBe(3);
    expect(updatedProduct?.stockDamaged).toBe(2);
    expect(balance?.quantityTemporaryOwed).toBe(5);
  });
});
