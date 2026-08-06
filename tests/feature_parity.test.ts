import { beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import {
  CustomerSpecialPricing,
  EquipmentLedgerEntry,
} from "../src/backend/models";
import { ReportService } from "../src/backend/services/report.service";
import { UserRole } from "../src/lib/definitions";
import { useUIStore } from "../src/store/uiStore";

describe("Feature Parity: Expanded Models, UI Store & Report Analytics", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should support CustomerSpecialPricing and EquipmentLedgerEntry models", () => {
    expect(CustomerSpecialPricing).toBeDefined();
    expect(EquipmentLedgerEntry).toBeDefined();
  });

  it("should manage UI store state for products, users, orders, and adjustments", () => {
    const store = useUIStore.getState();

    store.setProductFormModalOpen(true, {
      product_id: 1,
      name: "Purified Water",
      unit_price: 50,
      stock_in_station: 100,
    });
    expect(useUIStore.getState().isProductModalOpen).toBe(true);
    expect(useUIStore.getState().editingProduct?.name).toBe("Purified Water");

    store.setUserModalOpen(true, {
      user_id: 1,
      name: "Admin",
      email: "admin@test.com",
      role: UserRole.ADMIN,
    });
    expect(useUIStore.getState().isUserModalOpen).toBe(true);
    expect(useUIStore.getState().editingUser?.email).toBe("admin@test.com");

    store.setOrderFormModalOpen(true);
    expect(useUIStore.getState().isOrderModalOpen).toBe(true);

    store.setProducts([
      { productId: 1, name: "Test Product", unitPrice: 50 } as any,
    ]);
    expect(useUIStore.getState().products.length).toBe(1);
    expect(useUIStore.getState().products[0].name).toBe("Test Product");
  });

  it("should execute dailySales and weeklyChurn report services cleanly", async () => {
    const dailySales = await ReportService.getDailySales("2026-07-30");
    expect(dailySales).toBeDefined();
    expect(dailySales.totalSales).toBeGreaterThanOrEqual(0);

    const weeklyChurn = await ReportService.getWeeklyChurn();
    expect(weeklyChurn).toBeDefined();
    expect(Array.isArray(weeklyChurn.customers)).toBe(true);
  });
});
