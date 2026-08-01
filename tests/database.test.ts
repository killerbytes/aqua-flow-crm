import { describe, it, expect } from "vitest";
import { getDatabaseUrl } from "../src/backend/db/database";

describe("Database Configuration & .env.local loader", () => {
  it("should construct PostgreSQL connection URL from DB_* environment variables", () => {
    const customEnv = {
      DB_USER: "postgres",
      DB_PASSWORD: "killer",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "crystal_clear_crm",
    };

    const url = getDatabaseUrl(customEnv);
    expect(url).toBe("postgres://postgres:killer@localhost:5432/crystal_clear_crm");
  });

  it("should prioritize DATABASE_URL if present in environment", () => {
    const customEnv = {
      DATABASE_URL: "postgres://custom_user:custom_pass@db.example.com:5432/custom_db",
      DB_USER: "postgres",
    };

    const url = getDatabaseUrl(customEnv);
    expect(url).toBe("postgres://custom_user:custom_pass@db.example.com:5432/custom_db");
  });
});
