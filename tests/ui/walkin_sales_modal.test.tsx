import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - WalkInSalesModal Component & Header Button", () => {
  it("should have WalkInSalesModal component with default DELIVERED and PAID statuses", () => {
    const modalPath = path.resolve(
      process.cwd(),
      "src/features/orders/components/WalkInSalesModal.tsx",
    );
    const content = fs.readFileSync(modalPath, "utf-8");

    expect(content).toContain("Consolidated Daily Walk-In Sales");
    expect(content).toContain("OrderStatus.DELIVERED");
    expect(content).toContain("PaymentStatus.PAID");
    expect(content).toContain("getWalkInCustomerAction");
    expect(content).toContain("createOrderAction");
  });

  it("should render Record Walk-In Sales button in orders page header", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/orders/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    expect(content).toContain("WalkInSalesModalButton");
    expect(content).toContain("Walk-In Sales");
    expect(content).toContain("WalkInSalesModal");
  });
});
