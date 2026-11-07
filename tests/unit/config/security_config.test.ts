import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { UserSchema } from "../../../src/backend/schemas/zodSchemas";

vi.mock("@sentry/nextjs/config", () => ({
  withSentryConfig: (config: unknown) => config,
}));

const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));

describe("Unit - Security Headers", () => {
  const getHeaders = async () => {
    const { default: config } = await import("../../../next.config.mjs");
    const [rule] = await (config as any).headers();
    const headers: Record<string, string> = Object.fromEntries(
      rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    );
    return { source: rule.source, headers };
  };

  it("should apply to every path", async () => {
    expect((await getHeaders()).source).toBe("/:path*");
  });

  it("should stop the app being framed", async () => {
    const { headers } = await getHeaders();
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("should not restrict scripts, which would break Next.js pages", async () => {
    const { headers } = await getHeaders();
    expect(headers["Content-Security-Policy"]).not.toMatch(
      /default-src|script-src/,
    );
  });

  it("should set the remaining headers", async () => {
    const { headers } = await getHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBeDefined();
    expect(headers["Permissions-Policy"]).toBeDefined();
    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
  });
});

describe("Unit - Production Dependencies", () => {
  const pkg = readJson("package.json");

  it("should install sequelize-cli in production, for the pre-deploy migration", () => {
    expect(pkg.dependencies["sequelize-cli"]).toBeDefined();
    expect(readJson("railway.json").deploy.preDeployCommand).toEqual([
      "npm run db:migrate",
    ]);
  });

  it("should keep the test database driver out of production", () => {
    expect(pkg.dependencies.sqlite3).toBeUndefined();
    expect(pkg.devDependencies.sqlite3).toBeDefined();
  });

  it("should keep shadcn in dependencies, because globals.css imports it", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    expect(css).toContain("shadcn/tailwind.css");
    expect(pkg.dependencies.shadcn).toBeDefined();
  });
});

describe("Unit - Password Minimum", () => {
  const parse = (password: string) =>
    UserSchema.safeParse({
      name: "Test",
      username: "test",
      password,
      role: "CASHIER",
    });

  it("should accept 4 characters and refuse 3", () => {
    expect(parse("abcd").success).toBe(true);
    expect(parse("abc").success).toBe(false);
  });

  it("should state the real minimum in its error", () => {
    const result = parse("abc");
    expect(result.error?.flatten().fieldErrors.password?.[0]).toBe(
      "Password must be at least 4 characters",
    );
  });
});

describe("Unit - Database Defaults", () => {
  it("should default migrations and the app to the same database", async () => {
    const config = fs.readFileSync(
      path.resolve(process.cwd(), "src/backend/db/config.js"),
      "utf8",
    );
    const env = fs.readFileSync(
      path.resolve(process.cwd(), "src/backend/db/env.ts"),
      "utf8",
    );

    expect(env).toContain('DB_NAME: z.string().default("crystal_clear_crm")');
    expect(config).toContain('process.env.DB_NAME || "crystal_clear_crm"');
    expect(env).toContain('DB_PASSWORD: z.string().default("secret")');
    expect(config).toContain('process.env.DB_PASSWORD || "secret"');
  });
});
