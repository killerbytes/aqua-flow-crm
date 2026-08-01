import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ORDER_STATUS_OPTIONS, EQUIPMENT_ACTION_OPTIONS } from "../src/lib/definitions";

describe("AquaFlow CRM UI Design System & Definitions", () => {
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
});
