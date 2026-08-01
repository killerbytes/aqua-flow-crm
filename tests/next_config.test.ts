import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Next.js Configuration & Rewrites", () => {
  it("should have next.config.mjs configuring rewrite from /graphql to /api/graphql", async () => {
    const configPath = path.resolve(process.cwd(), "next.config.mjs");
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, "utf-8");
    expect(configContent).toContain("/graphql");
    expect(configContent).toContain("/api/graphql");
  });
});
