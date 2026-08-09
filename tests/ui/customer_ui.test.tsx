import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("UI - Customer Components & Layout Structure", () => {
  it("should have CustomerLookup properly included in Sidebar component", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/components/shared/Sidebar.tsx",
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("<CustomerLookup");
  });

  it("should include redirect check for non-existent customers", () => {
    const pagePath = path.resolve(
      process.cwd(),
      "src/app/customers/[id]/page.tsx",
    );
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain('redirect("/customers")');
  });
});
