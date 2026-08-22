import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - PaymentModal Component Structure & Action Binding", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/features/orders/components/PaymentModal.tsx",
  );
  const content = fs.readFileSync(filePath, "utf-8");

  it("should import makePaymentAction and PaymentSchema", () => {
    expect(content).toContain("makePaymentAction");
    expect(content).toContain("PaymentSchema");
  });

  it("should initialize form with default payment method CASH", () => {
    expect(content).toContain("PaymentMethod.CASH");
  });

  it("should call makePaymentAction with form data and orderId", () => {
    expect(content).toContain("makePaymentAction(data, editingOrder.orderId)");
  });

  it("should render error toast when server action succeeds or fails", () => {
    expect(content).toContain("toast.add");
    expect(content).toContain("res.error");
  });
});
