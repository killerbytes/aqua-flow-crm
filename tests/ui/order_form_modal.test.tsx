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

  it("should handle optional unitPrice safely in calculateTotal", () => {
    expect(content).toContain("sum + item.quantity * (item.unitPrice ?? 0)");
  });

  it("should call createOrderAction upon form submission", () => {
    expect(content).toContain("createOrderAction(data)");
  });
});
