import { describe, expect, it } from "vitest";
import { env } from "../src/backend/db/env";

describe("Environment Variables Schema (Edge & Node compatible)", () => {
  it("should export valid env object parsed from process.env", () => {
    expect(env).toBeDefined();
    expect(typeof env.JWT_SECRET).toBe("string");
    expect(typeof env.DB_PORT).toBe("number");
    expect(typeof env.PORT).toBe("number");
    expect(typeof env.DB_NAME).toBe("string");
    expect(typeof env.NEXT_PUBLIC_CURRENCY).toBe("string");
    expect(["development", "local", "production", "test"]).toContain(env.NODE_ENV);
  });
});
