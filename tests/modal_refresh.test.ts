import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("CustomerFormModal Next.js Router Refresh Integration", () => {
  it("should import useRouter from next/navigation and invoke router.refresh() on success", () => {
    const modalPath = path.resolve(
      process.cwd(),
      "src/features/customers/components/CustomerFormModal.tsx"
    );
    const content = fs.readFileSync(modalPath, "utf-8");

    expect(content).toContain('import { useRouter } from "next/navigation"');
    expect(content).toContain("router.refresh()");
  });
});
