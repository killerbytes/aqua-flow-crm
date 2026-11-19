import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - OrderFormModal Component Structure & Action Binding", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/features/orders/components/OrderFormModal.tsx",
  );
  const content = fs.readFileSync(filePath, "utf-8");
  const itemsContent = fs.readFileSync(
    path.resolve(
      process.cwd(),
      "src/features/orders/components/OrderItemsField.tsx",
    ),
    "utf-8",
  );

  it("should import createOrderAction and OrderSchema", () => {
    expect(content).toContain("createOrderAction");
    expect(content).toContain("OrderSchema");
  });

  it("should watch customerId reactively and check for specialPricings", () => {
    expect(content).toContain("customerId");
    expect(content).toContain("specialPricings");
  });

  it("should display special discount indicator when item product has special pricing", () => {
    expect(content).toContain("OrderItemsField");
    expect(itemsContent).toContain("discountAmount");
    expect(itemsContent).toContain("Special Discount");
  });

  it("should display equipment balances when customer is selected", () => {
    expect(content).toContain("equipmentBalances");
  });

  it("should let an order's date be entered, starting at today in Manila", () => {
    const dateContent = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/features/orders/components/OrderDateField.tsx",
      ),
      "utf-8",
    );
    expect(content).toContain("<OrderDateField");
    // Editing starts at the order's own date and sends it with the update.
    expect(content).toContain(
      "createdAt: businessDateKey(new Date(editingOrder.createdAt))",
    );
    expect(content).toContain("createdAt: data.createdAt");
    expect(content).toContain("createdAt: todayOrderDate()");
    expect(dateContent).toContain('type="date"');
    expect(dateContent).toContain("max={todayOrderDate()}");
    expect(dateContent).toContain("min={earliestOrderDate(current)}");
    expect(dateContent).toContain("MAX_ORDER_BACKDATE_DAYS");
    expect(dateContent).toContain("businessDateKey(new Date())");
  });
});
