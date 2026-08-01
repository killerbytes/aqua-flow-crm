import { describe, it, expect } from "vitest";
import { initDatabase, sequelize } from "../src/backend/db/database";

describe("Database Initialization & Sync Resilience", () => {
  it("should initialize database connection without throwing constraint errors", async () => {
    await expect(initDatabase()).resolves.not.toThrow();
  });

  it("should authenticate sequelize instance cleanly", async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
