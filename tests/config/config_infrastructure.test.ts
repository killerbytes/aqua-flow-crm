import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { env } from "../../src/backend/db/env";

describe("Config & Infrastructure Validation", () => {
  it("should export valid env object parsed from process.env", () => {
    expect(env).toBeDefined();
    expect(typeof env.JWT_SECRET).toBe("string");
    expect(typeof env.DB_PORT).toBe("number");
    expect(typeof env.PORT).toBe("number");
    expect(typeof env.DB_NAME).toBe("string");
    expect(typeof env.NEXT_PUBLIC_CURRENCY).toBe("string");
    expect(["development", "local", "production", "test"]).toContain(
      env.NODE_ENV,
    );
  });

  it("should have Next.js config file present", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const exists =
      fs.existsSync(configPath) ||
      fs.existsSync(path.resolve(process.cwd(), "next.config.mjs"));
    expect(exists).toBe(true);
  });

  it("should have Tailwind CSS configured in package.json or postcss", () => {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkgContent = fs.readFileSync(pkgPath, "utf-8");
    expect(pkgContent).toContain("tailwindcss");
  });
});
