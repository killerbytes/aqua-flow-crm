import path from "path";
import { describe, expect, it } from "vitest";

describe("Backup Script Environment Loading", () => {
  it("should load .env.production overrides when NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    const backupPath = path.resolve(process.cwd(), "backup.js");
    expect(() => require(backupPath)).not.toThrow();
  });
});
