import { describe, expect, it, beforeAll } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { ProductService } from "../src/backend/services/product.service";
import { EquipmentActionType } from "../src/lib/definitions";

describe("Equipment Service Product Inventory Stock Validation", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should throw error when logging equipment for a non-existent product", async () => {
    await expect(
      EquipmentService.logEquipment(
        {
          customerId: 1,
          productId: 999999,
          actionType: EquipmentActionType.ISSUE,
          quantity: 1,
        },
        1
      )
    ).rejects.toThrow("Product not found");
  });

  it("should throw error when ISSUE quantity exceeds stockInStation", async () => {
    const customerId = 1;
    const productId = 1;

    const product = await ProductService.get(productId);
    const stockInStation = product.stockInStation;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.ISSUE,
          quantity: stockInStation + 999,
        },
        1
      )
    ).rejects.toThrow(
      `Cannot issue ${stockInStation + 999} container(s). Only ${stockInStation} available in station.`
    );
  });

  it("should throw error when TEMPORARY quantity exceeds stockInStation", async () => {
    const customerId = 1;
    const productId = 1;

    const product = await ProductService.get(productId);
    const stockInStation = product.stockInStation;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.TEMPORARY,
          quantity: stockInStation + 999,
        },
        1
      )
    ).rejects.toThrow(
      `Cannot process ${stockInStation + 999} temporary container(s). Only ${stockInStation} available in station.`
    );
  });

  it("should successfully log equipment when stockInStation is sufficient", async () => {
    const customerId = 1;
    const productId = 1;

    const productBefore = await ProductService.get(productId);
    const initialStock = productBefore.stockInStation;

    if (initialStock > 0) {
      await EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.ISSUE,
          quantity: 1,
        },
        1
      );

      const productAfter = await ProductService.get(productId);
      expect(productAfter.stockInStation).toBe(initialStock - 1);
    }
  });
});
