import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - Printable Statement & Route Structure", () => {
  it("should have PrintableStatement component file created with print layout", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/features/invoices/components/PrintableStatement.tsx",
    );
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("Statement of Account");
    expect(content).toContain("/logo.jpg");
    expect(content).toContain("window.print()");
    expect(content).toContain("Payment History Ledger");
    expect(content).toContain("Net Balance Due");
  });

  it("should have dedicated print route at src/app/invoices/[id]/print/page.tsx", () => {
    const routePath = path.resolve(
      process.cwd(),
      "src/app/invoices/[id]/print/page.tsx",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    expect(content).toContain("PrintableStatement");
    expect(content).toContain("InvoiceService.get");
    expect(content).toContain("InvoiceService.getPayments");
  });

  it("should include Print Statement link on Invoice Detail page", () => {
    const pagePath = path.resolve(
      process.cwd(),
      "src/app/invoices/[id]/page.tsx",
    );
    const content = fs.readFileSync(pagePath, "utf-8");

    expect(content).toContain("/print`");
    expect(content).toContain("Print Statement");
  });
});
