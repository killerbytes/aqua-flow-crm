import { describe, expect, it } from "vitest";
import { logEquipmentAction } from "../src/backend/actions/customer.actions";
import {
  createAdjustmentAction,
  getInventoryAction,
} from "../src/backend/actions/product.actions";
import { InventoryService, ProductService } from "../src/backend/services";

describe("Consolidated Domain Actions & Services", () => {
  it("should export InventoryService from product service module", () => {
    expect(InventoryService).toBeDefined();
    expect(typeof InventoryService.getAll).toBe("function");
    expect(typeof InventoryService.createAdjustment).toBe("function");
    expect(ProductService).toBeDefined();
  });

  it("should export inventory actions from product.actions", () => {
    expect(typeof getInventoryAction).toBe("function");
    expect(typeof createAdjustmentAction).toBe("function");
  });

  it("should export equipment action from customer.actions", () => {
    expect(typeof logEquipmentAction).toBe("function");
  });
});
