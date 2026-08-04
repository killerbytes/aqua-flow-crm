import { beforeAll, describe, expect, it } from "vitest";
import { CustomerEquipmentBalance } from "../src/backend/models/CustomerEquipmentBalance";
import { ProductInventory } from "../src/backend/models/ProductInventory";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { EquipmentActionType, CustomerStatus } from "../src/lib/definitions";
import { seedDatabase } from "../src/backend/db/seed";

describe("Equipment Lost and Damaged TDD Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should log LOST for regular containers and update quantityOwed & stockLost", async () => {
    const customerId = 1;
    const productId = 1;

    // Issue 5 regular containers first
    await EquipmentService.logEquipment(
      {
        customerId,
        productId,
        actionType: EquipmentActionType.ISSUE,
        quantity: 5,
        notes: "Issuing 5 containers for test",
      },
      1
    );

    const initialBalance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const initialOwed = initialBalance?.quantityOwed ?? 0;

    const initialProduct = await ProductInventory.findByPk(productId);
    const initialLost = initialProduct?.stockLost ?? 0;
    const initialWithCustomers = initialProduct?.stockWithCustomers ?? 0;

    // Log 2 lost containers
    await EquipmentService.logEquipment(
      {
        customerId,
        productId,
        actionType: EquipmentActionType.LOST,
        quantity: 2,
        notes: "2 containers lost by customer",
      },
      1
    );

    const updatedBalance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const updatedProduct = await ProductInventory.findByPk(productId);

    expect(updatedBalance?.quantityOwed).toBe(initialOwed - 2);
    expect(updatedProduct?.stockLost).toBe(initialLost + 2);
    expect(updatedProduct?.stockWithCustomers).toBe(initialWithCustomers - 2);
  });

  it("should log TEMPORARY_DAMAGED and update quantityTemporaryOwed & stockDamaged", async () => {
    const customerId = 2;
    const productId = 1;

    // Issue 3 temporary containers
    await EquipmentService.logEquipment(
      {
        customerId,
        productId,
        actionType: EquipmentActionType.TEMPORARY,
        quantity: 3,
        notes: "Issuing 3 temporary containers",
      },
      1
    );

    const initialBalance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const initialTempOwed = initialBalance?.quantityTemporaryOwed ?? 0;

    const initialProduct = await ProductInventory.findByPk(productId);
    const initialDamaged = initialProduct?.stockDamaged ?? 0;
    const initialWithCustomers = initialProduct?.stockWithCustomers ?? 0;

    // Log TEMPORARY_DAMAGED for 1 container
    await EquipmentService.logEquipment(
      {
        customerId,
        productId,
        actionType: EquipmentActionType.TEMPORARY_DAMAGED,
        quantity: 1,
        notes: "1 temporary container damaged",
      },
      1
    );

    const updatedBalance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const updatedProduct = await ProductInventory.findByPk(productId);

    expect(updatedBalance?.quantityTemporaryOwed).toBe(initialTempOwed - 1);
    expect(updatedProduct?.stockDamaged).toBe(initialDamaged + 1);
    expect(updatedProduct?.stockWithCustomers).toBe(initialWithCustomers - 1);
  });

  it("should throw validation error when attempting to mark more regular containers LOST than currently owed", async () => {
    const customerId = 3;
    const productId = 1;

    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const currentOwed = balance?.quantityOwed ?? 0;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.LOST,
          quantity: currentOwed + 100,
          notes: "Attempting excessive lost logging",
        },
        1
      )
    ).rejects.toThrow();
  });

  it("should throw validation error when attempting to mark more TEMPORARY_DAMAGED containers than currently borrowed", async () => {
    const customerId = 3;
    const productId = 1;

    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
    });
    const currentTemp = balance?.quantityTemporaryOwed ?? 0;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.TEMPORARY_DAMAGED,
          quantity: currentTemp + 100,
          notes: "Attempting excessive temporary damaged logging",
        },
        1
      )
    ).rejects.toThrow();
  });
});
