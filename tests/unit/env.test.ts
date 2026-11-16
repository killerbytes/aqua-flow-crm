import { describe, expect, it } from "vitest";
import { env, envSchema } from "../../src/backend/db/env";

describe("Unit - Environment Schema Validation", () => {
  it("should fall back to working defaults when nothing is set", () => {
    expect(envSchema.parse({})).toMatchObject({
      NODE_ENV: "development",
      PORT: 3000,
      DB_PORT: 5432,
      NEXT_PUBLIC_CURRENCY: "PHP",
    });
  });

  it("should read ports as numbers", () => {
    const parsed = envSchema.parse({ PORT: "8080", DB_PORT: "6543" });
    expect(parsed.PORT).toBe(8080);
    expect(parsed.DB_PORT).toBe(6543);
  });

  it("should refuse an unknown NODE_ENV and a short JWT_SECRET", () => {
    expect(envSchema.safeParse({ NODE_ENV: "staging" }).success).toBe(false);
    expect(envSchema.safeParse({ JWT_SECRET: "short" }).success).toBe(false);
  });

  it("should reject a missing JWT_SECRET in production", () => {
    expect(envSchema.safeParse({ NODE_ENV: "production" }).success).toBe(false);
  });

  it("should accept a real JWT_SECRET in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      JWT_SECRET: "a-real-production-secret",
    });
    expect(result.success).toBe(true);
  });

  it("should still allow the fallback secret outside production", () => {
    expect(envSchema.safeParse({ NODE_ENV: "development" }).success).toBe(true);
  });

  it("should export the parsed environment the app reads", () => {
    expect(typeof env.JWT_SECRET).toBe("string");
    expect(typeof env.PORT).toBe("number");
    expect(typeof env.DB_PORT).toBe("number");
  });
});
