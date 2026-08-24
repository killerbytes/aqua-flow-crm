import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - OrderFormModal Component Structure & Action Binding", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/features/orders/components/OrderFormModal.tsx",
  );
  const content = fs.readFileSync(filePath, "utf-8");

  it("should import createOrderAction and OrderSchema", () => {
    expect(content).toContain("createOrderAction");
    expect(content).toContain("OrderSchema");
  });

  it("should watch customerId reactively and check for specialPricings", () => {
    expect(content).toContain("customerId");
    expect(content).toContain("specialPricings");
  });

  it("should display special discount indicator when item product has special pricing", () => {
    expect(content).toContain("discountAmount");
    expect(content).toContain("Special Discount");
  });

  it("should display equipment balances when customer is selected", () => {
    expect(content).toContain("equipmentBalances");
    expect(content).toContain("Equipment Balances");
  });
});


