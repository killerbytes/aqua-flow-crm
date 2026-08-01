import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Tailwind CSS v4 Configuration & Source Directives", () => {
  it("should have PostCSS configuration files with @tailwindcss/postcss plugin", () => {
    const configMjsPath = path.resolve(process.cwd(), "postcss.config.mjs");
    const configJsPath = path.resolve(process.cwd(), "postcss.config.js");

    expect(fs.existsSync(configMjsPath)).toBe(true);
    expect(fs.existsSync(configJsPath)).toBe(true);

    const mjsContent = fs.readFileSync(configMjsPath, "utf-8");
    const jsContent = fs.readFileSync(configJsPath, "utf-8");

    expect(mjsContent).toContain("@tailwindcss/postcss");
    expect(jsContent).toContain("@tailwindcss/postcss");
  });

  it("should include @source directive in globals.css to scan all src subdirectories", () => {
    const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain('@source "..";');
  });
});
