import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSequelizePoolOptions } from "../../../src/backend/db/database";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const readJson = (file: string) => JSON.parse(read(file));

describe("Unit - Deploy Configuration", () => {
  const railway = readJson("railway.json").deploy;
  const pkg = readJson("package.json");

  describe("Railway", () => {
    it("should start the standalone server, bound to every interface", () => {
      expect(railway.startCommand).toBe("node .next/standalone/server.js");
      expect(railway.env.HOSTNAME).toBe("0.0.0.0");
      expect(read("next.config.mjs")).toContain('output: "standalone"');
    });

    it("should migrate before deploying and wait for the health check", () => {
      expect(railway.preDeployCommand).toEqual(["npm run db:migrate"]);
      expect(railway.healthcheckPath).toBe("/api/health");
      // The migration runs in the production image, so its CLI must be there.
      expect(pkg.dependencies["sequelize-cli"]).toBeDefined();
    });

    it("should turn Next.js telemetry off", () => {
      expect(railway.env.NEXT_TELEMETRY_DISABLED).toBe("1");
    });
  });

  describe("Database", () => {
    it("should let the pool empty, so a sleeping database isn't held open", () => {
      expect(getSequelizePoolOptions()).toMatchObject({
        min: 0,
        max: 5,
        idle: 10000,
        evict: 1000,
        acquire: 30000,
      });
    });

    it("should default migrations and the app to the same database", () => {
      const config = read("src/backend/db/config.js");
      const env = read("src/backend/db/env.ts");

      expect(env).toContain('DB_NAME: z.string().default("crystal_clear_crm")');
      expect(config).toContain('process.env.DB_NAME || "crystal_clear_crm"');
      expect(env).toContain('DB_PASSWORD: z.string().default("secret")');
      expect(config).toContain('process.env.DB_PASSWORD || "secret"');
    });
  });

  describe("Dependencies", () => {
    it("should keep the test database driver out of production", () => {
      expect(pkg.dependencies.sqlite3).toBeUndefined();
      expect(pkg.devDependencies.sqlite3).toBeDefined();
    });

    it("should install what the production build needs", () => {
      // The build compiles CSS, and globals.css imports shadcn's stylesheet.
      expect(pkg.dependencies.tailwindcss).toBeDefined();
      expect(pkg.dependencies["@tailwindcss/postcss"]).toBeDefined();
      expect(read("src/app/globals.css")).toContain("shadcn/tailwind.css");
      expect(pkg.dependencies.shadcn).toBeDefined();
    });

    it("should declare the Linux Tailwind bindings for Railway builds", () => {
      const optional = pkg.optionalDependencies;
      expect(optional["@tailwindcss/oxide-linux-x64-gnu"]).toBeDefined();
      expect(optional["@tailwindcss/oxide-linux-x64-musl"]).toBeDefined();
    });

    it("should pin the Node version Next.js 16 requires", () => {
      expect(pkg.engines.node).toBe(">=20.9.0");
      expect(read(".nvmrc").trim()).toBe("20");
    });
  });
});
