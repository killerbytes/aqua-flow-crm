import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Root Layout Font Validation", () => {
  it("should not import unknown font Georgia from next/font/google in layout.tsx", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).not.toMatch(/import\s*\{[^}]*Georgia[^}]*\}\s*from\s*["']next\/font\/google["']/);
  });

  it("should use Lora for serif font in layout.tsx", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toMatch(/import\s*\{[^}]*Lora[^}]*\}\s*from\s*["']next\/font\/google["']/);
  });
});
