import { beforeAll, describe, expect, it } from "vitest";
import { ProductInventory } from "../../src/backend/models/ProductInventory";
import { InventoryService } from "../../src/backend/services/inventory.service";
import { InventoryAdjustmentType } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Inventory Service Stock Adjustments", () => {
  beforeAll(async () => {
    await setupTestDatabase();
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
    expect(updatedProduct?.stockDamaged).toBe(7);
    expect(updatedProduct?.stockLost).toBe(1);
  });

  it("should increase stockLost and decrease stockInStation when adjustment is DECLARED_LOST", async () => {
    const created = await ProductInventory.create({
      name: `Test Lost ${Date.now()}_2`,
      stockInStation: 30,
      stockDamaged: 0,
      stockLost: 3,
      unitPrice: 30,
    });
    const productId = created.productId;

    const result = await InventoryService.createAdjustment({
      productId,
      adjustmentType: InventoryAdjustmentType.DECLARED_LOST,
      quantity: 10,
      reason: "Missing from warehouse",
    });

    expect(result).toBeDefined();

    const updatedProduct = await ProductInventory.findByPk(productId);
    expect(updatedProduct?.stockInStation).toBe(20);
    expect(updatedProduct?.stockLost).toBe(13);
    expect(updatedProduct?.stockDamaged).toBe(0);
  });

  it("should increase stockInStation when adjustment is STOCK_IN", async () => {
    const created = await ProductInventory.create({
      name: `Test Restock ${Date.now()}_3`,
      stockInStation: 20,
      stockDamaged: 5,
      stockLost: 2,
      unitPrice: 30,
    });
    const productId = created.productId;

    const result = await InventoryService.createAdjustment({
      productId,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 15,
      reason: "Restocked from supplier",
    });

    expect(result).toBeDefined();

    const updatedProduct = await ProductInventory.findByPk(productId);
    expect(updatedProduct?.stockInStation).toBe(35);
  });

  it("should throw validation error when declaring damaged/lost more than available station stock", async () => {
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
    ).rejects.toThrow(/Cannot adjust 10 container\(s\) as DECLARED_DAMAGED/i);
  });
});
