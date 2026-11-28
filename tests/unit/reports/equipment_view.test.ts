import { describe, expect, it } from "vitest";
import type {
  CustomerEquipmentRow,
  InactiveCustomerWithEquipmentRow,
} from "../../../src/backend/services/report.service";
import {
  customerEquipmentView,
  inactiveEquipmentFilter,
} from "../../../src/features/reports/equipment";

const row = (
  customerId: number,
  productId: number,
  barangayId: string | null,
): CustomerEquipmentRow => ({
  customerId,
  customerName: `C${customerId}`,
  phone: null,
  barangayId,
  barangay: barangayId ? `B${barangayId}` : null,
  productId,
  productName: `P${productId}`,
  quantity: 1,
});

const rows = [row(1, 1, "A"), row(1, 2, "A"), row(2, 1, "B"), row(3, 2, null)];

describe("customerEquipmentView", () => {
  it("should show every row when nothing is picked", () => {
    expect(customerEquipmentView(rows, {}).rows).toHaveLength(4);
  });

  it("should filter by any of the products and barangays picked", () => {
    const view = customerEquipmentView(rows, { product: ["1"], barangay: "B" });
    expect(view.rows.map((r) => [r.customerId, r.productId])).toEqual([[2, 1]]);
    expect(view.query).toBe("product=1&barangay=B");
    expect(view.filterLines).toEqual(["Product: P1", "Barangay: BB"]);
  });

  it("should count products across all rows and keep a picked one with none", () => {
    const view = customerEquipmentView(rows, { product: ["9"] });
    expect(view.rows).toEqual([]);
    expect(view.productOptions).toEqual([
      { code: "1", name: "P1", count: 2 },
      { code: "2", name: "P2", count: 2 },
      { code: "9", name: "Product #9", count: 0 },
    ]);
  });
});

describe("inactiveEquipmentFilter", () => {
  const inactive = (
    customerId: number,
    equipment: [number, number][],
  ): InactiveCustomerWithEquipmentRow => ({
    customerId,
    customerName: `C${customerId}`,
    phone: null,
    address: null,
    barangayId: null,
    barangay: null,
    customerSince: new Date(0),
    lastOrderAt: null,
    daysSinceLastOrder: null,
    equipment: equipment.map(([productId, quantity]) => ({
      productId,
      productName: `P${productId}`,
      quantity,
    })),
    totalHeld: equipment.reduce((sum, [, quantity]) => sum + quantity, 0),
  });
  const rows = [inactive(1, [[1, 2], [2, 3]]), inactive(2, [[2, 1]])];

  it("should keep every row whole when nothing is picked", () => {
    expect(inactiveEquipmentFilter(rows, undefined).rows).toBe(rows);
  });

  it("should keep only the picked products and total them", () => {
    const filter = inactiveEquipmentFilter(rows, ["1"]);
    expect(filter.rows).toHaveLength(1);
    expect(filter.rows[0]).toMatchObject({ customerId: 1, totalHeld: 2 });
    expect(filter.rows[0].equipment.map((e) => e.productId)).toEqual([1]);
    expect(filter.filterLines).toEqual(["Product: P1"]);
    expect(filter.productOptions).toEqual([
      { code: "1", name: "P1", count: 1 },
      { code: "2", name: "P2", count: 2 },
    ]);
  });
});
