import { describe, it, expect } from "vitest";
import { initDatabase } from "../src/backend/db/database";

describe("Database Singleton & Auto-Initialization", () => {
  it("should return the exact same promise when initDatabase is called concurrently", () => {
    const promise1 = initDatabase();
    const promise2 = initDatabase();
    expect(promise1).toBe(promise2);
  });

  it("should resolve without throwing errors", async () => {
    await expect(initDatabase()).resolves.not.toThrow();
  });
});
