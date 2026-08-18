import { describe, expect, it } from "vitest";
import { getSequelizePoolOptions } from "@/backend/db/database";
import fs from "node:fs";
import path from "node:path";

describe("Unit - Railway Serverless Configuration", () => {
  it("should configure Sequelize pool options with min: 0 and aggressive idle timeout for Railway sleeping", () => {
    const pool = getSequelizePoolOptions();
    expect(pool.min).toBe(0);
    expect(pool.max).toBe(5);
    expect(pool.idle).toBe(10000);
    expect(pool.evict).toBe(1000);
    expect(pool.acquire).toBe(30000);
  });

  it("should have next.config.mjs configured with standalone output", async () => {
    const nextConfigPath = path.resolve(process.cwd(), "next.config.mjs");
    expect(fs.existsSync(nextConfigPath)).toBe(true);
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).toContain('output: "standalone"');
  });

  it("should have railway.json configured with startCommand and NEXT_TELEMETRY_DISABLED", () => {
    const railwayJsonPath = path.resolve(process.cwd(), "railway.json");
    expect(fs.existsSync(railwayJsonPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(railwayJsonPath, "utf-8"));
    expect(content.deploy.startCommand).toBe("node .next/standalone/server.js");
    expect(content.deploy.env.NEXT_TELEMETRY_DISABLED).toBe("1");
  });
});
