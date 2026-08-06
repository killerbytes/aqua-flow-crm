import { beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { ProductInventory } from "../src/backend/models/ProductInventory";
import { InventoryService } from "../src/backend/services/inventory.service";
import { InventoryAdjustmentType } from "../src/lib/definitions";

describe("InventoryService Adjustment Logic TDD Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should increase stockDamaged and decrease stockInStation when adjustment is DECLARED_DAMAGED", async () => {
    const created = await ProductInventory.create({
      name: `Test Damaged ${Date.now()}_1`,
      stockInStation: 50,
      stockDamaged: 2,
      stockLost: 1,
      unitPrice: 30,
    });
    const productId = created.productId;

    const result = await InventoryService.createAdjustment({
      productId,
      adjustmentType: InventoryAdjustmentType.DECLARED_DAMAGED,
      quantity: 5,
      reason: "Damaged during handling",
    });

    expect(result).toBeDefined();

    const updatedProduct = await ProductInventory.findByPk(productId);
    expect(updatedProduct?.stockInStation).toBe(45);
    expect(updatedProduct?.stockDamaged).toBe(7); // 2 initial + 5 damaged
    expect(updatedProduct?.stockLost).toBe(1); // Unchanged
  });

  it("should increase stockLost and decrease stockInStation when adjustment is DECLARED_LOST", async () => {
    const created = await ProductInventory.create({
      name: `Test Lost ${Date.now()}_2`,
      stockInStation: 30,
      stockDamaged: 0,
      stockLost: 3,
      unitPrice: 30,
    });
    const productId = created.get("productId") as number;

    const result = await InventoryService.createAdjustment({
      productId,
      adjustmentType: InventoryAdjustmentType.DECLARED_LOST,
      quantity: 10,
      reason: "Missing from warehouse",
    });

    expect(result).toBeDefined();

    const updatedProduct = await ProductInventory.findByPk(productId);
    expect(updatedProduct?.stockInStation).toBe(20);
    expect(updatedProduct?.stockLost).toBe(13); // 3 initial + 10 lost
    expect(updatedProduct?.stockDamaged).toBe(0); // Unchanged
  });

  it("should increase stockInStation and leave stockDamaged and stockLost unchanged when adjustment is STOCK_IN", async () => {
    const created = await ProductInventory.create({
      name: `Test Restock ${Date.now()}_3`,
      stockInStation: 20,
      stockDamaged: 5,
      stockLost: 2,
      unitPrice: 30,
    });
    const productId = created.get("productId") as number;

    const result = await InventoryService.createAdjustment({
      productId,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 15,
      reason: "Restocked from supplier",
    });

    expect(result).toBeDefined();

    const updatedProduct = await ProductInventory.findByPk(productId);
    expect(updatedProduct?.stockInStation).toBe(35);
    expect(updatedProduct?.stockDamaged).toBe(5);
    expect(updatedProduct?.stockLost).toBe(2);
  });

  it("should throw validation error when trying to declare damaged/lost more than available station stock", async () => {
    const created = await ProductInventory.create({
      name: `Test Excess ${Date.now()}_4`,
      stockInStation: 5,
      unitPrice: 30,
    });

    await expect(
      InventoryService.createAdjustment({
        productId: created.productId,
        adjustmentType: InventoryAdjustmentType.DECLARED_DAMAGED,
        quantity: 10,
        reason: "Excess declared damaged",
      }),
    ).rejects.toThrow("Cannot adjust 10 container(s) as DECLARED_DAMAGED. Only 5 available in station.");
  });
});
