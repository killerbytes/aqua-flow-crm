import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sidebar Print Hiding Verification", () => {
  it("should have print:hidden class on Sidebar component", () => {
    const sidebarPath = path.resolve(__dirname, "../../../src/components/shared/Sidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
    
    // Check that SidebarUI has print:hidden class
    expect(sidebarContent).toContain('print:hidden');
  });

  it("should import useSidebar in PrintableStatement to auto-hide or support hiding sidebar", () => {
    const statementPath = path.resolve(__dirname, "../../../src/features/invoices/components/PrintableStatement.tsx");
    const statementContent = fs.readFileSync(statementPath, "utf-8");

    // Check that PrintableStatement uses useSidebar or handles sidebar state
    expect(statementContent).toContain('useSidebar');
  });
});
