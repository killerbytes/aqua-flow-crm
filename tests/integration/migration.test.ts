import fs from "fs";
import path from "path";
import { DataTypes, Sequelize } from "sequelize";
import { describe, expect, it } from "vitest";

describe("Integration - Migration Files Integrity & Execution", () => {
  const migrationsDir = path.resolve(process.cwd(), "src", "backend", "migrations");

  it("should have a migrations directory with at least one baseline migration file", () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs.readdirSync(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith(".js") || f.endsWith(".ts"));
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  it("should export valid up and down migration hooks in baseline migration file", async () => {
    const files = fs.readdirSync(migrationsDir);
    const baselineFile = files.find((f) => f.includes("initial-schema"));
    expect(baselineFile).toBeDefined();

    const migrationPath = path.join(migrationsDir, baselineFile!);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const migration = require(migrationPath);

    expect(typeof migration.up).toBe("function");
    expect(typeof migration.down).toBe("function");
  });

  it("should successfully execute up and down migrations for all migration files sequentially on an isolated database", async () => {
    const testDb = new Sequelize("sqlite::memory:", {
      logging: false,
      dialectModule: require("sqlite3"),
    });

    const queryInterface = testDb.getQueryInterface();
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".js") || f.endsWith(".ts")).sort();

    // Execute UP migrations sequentially
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration = require(migrationPath);
      await migration.up(queryInterface, Sequelize);
    }

    // Verify all 11 core tables were created
    const tables = (await queryInterface.showAllTables()) as string[];
    expect(tables).toContain("users");
    expect(tables).toContain("customers");
    expect(tables).toContain("product_inventories");
    expect(tables).toContain("customer_equipment_balances");
    expect(tables).toContain("customer_special_pricings");
    expect(tables).toContain("equipment_ledger_entries");
    expect(tables).toContain("orders");
    expect(tables).toContain("order_details");
    expect(tables).toContain("invoices");
    expect(tables).toContain("invoice_details");
    expect(tables).toContain("invoice_payments");

    // Execute DOWN migrations in reverse order (Rollback)
    for (const file of [...files].reverse()) {
      const migrationPath = path.join(migrationsDir, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration = require(migrationPath);
      await migration.down(queryInterface, Sequelize);
    }

    const tablesAfterRollback = (await queryInterface.showAllTables()) as string[];
    expect(tablesAfterRollback).not.toContain("invoices");
    expect(tablesAfterRollback).not.toContain("users");
    expect(tablesAfterRollback).not.toContain("customers");
    expect(tablesAfterRollback).not.toContain("orders");

    await testDb.close();
  });
});
