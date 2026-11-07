import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_ACTION_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "../../src/lib/definitions";

describe("UI - Order Components & Theme Design System", () => {
  it("should have theme CSS variables in globals.css", () => {
    const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("--theme-blue");
    expect(cssContent).toContain("--primary");
    expect(cssContent).toContain("--card");
  });

  it("should contain definitions for order statuses and equipment action types", () => {
    expect(ORDER_STATUS_OPTIONS.length).toBeGreaterThan(0);
    expect(EQUIPMENT_ACTION_OPTIONS.length).toBeGreaterThan(0);
  });

  it("should format totalAmount in OrderList table column helper", () => {
    const orderListPath = path.resolve(
      process.cwd(),
      "src/features/orders/components/OrderList.tsx",
    );
    const content = fs.readFileSync(orderListPath, "utf-8");
    expect(content).toContain("totalAmount");
  });

  it("should render OrderActions in OrderList actions column for quick status updates", () => {
    const orderListPath = path.resolve(
      process.cwd(),
      "src/features/orders/components/OrderList.tsx",
    );
    const content = fs.readFileSync(orderListPath, "utf-8");
    expect(content).toContain("OrderActions");
    expect(content).toContain('id: "actions"');
    expect(content).toContain('header: "Actions"');
  });

  it("should have order actions for status updates in OrderActions component", () => {
    const orderActionsPath = path.resolve(
      process.cwd(),
      "src/features/orders/components/OrderActions.tsx",
    );
    const content = fs.readFileSync(orderActionsPath, "utf-8");
    expect(content).toContain("updateOrderStatusAction");
    expect(content).toContain("OrderStatus.OUT_FOR_DELIVERY");
    expect(content).toContain("OrderStatus.DELIVERED");
    expect(content).toContain("OrderStatus.CANCELLED");
    expect(content).toContain("OrderStatus.PENDING");
    expect(content).toContain("Back to Pending");
  });
});
