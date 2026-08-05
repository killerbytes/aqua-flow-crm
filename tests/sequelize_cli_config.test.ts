import path from "path";
import { describe, expect, it } from "vitest";

describe("Sequelize CLI Configuration Compatibility", () => {
  it("should have a valid .sequelizerc file pointing to src/backend/db/config.js", () => {
    const sequelizerc = require(path.resolve(process.cwd(), ".sequelizerc"));
    expect(sequelizerc.config).toBe(
      path.resolve(process.cwd(), "src", "backend", "db", "config.js")
    );
  });

  it("should require src/backend/db/config.js in CommonJS without throwing ERR_MODULE_NOT_FOUND", () => {
    const configPath = path.resolve(process.cwd(), "src", "backend", "db", "config.js");
    expect(() => require(configPath)).not.toThrow();
    const config = require(configPath);
    expect(config).toHaveProperty("development");
    expect(config).toHaveProperty("local");
    expect(config).toHaveProperty("test");
    expect(config).toHaveProperty("production");
    expect(config.development.dialect).toBe("postgres");
    expect(config.production.dialect).toBe("postgres");
  });

  it("should normalize postgresql:// protocol in DATABASE_URL to postgres://", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/dbname";
    const configPath = path.resolve(process.cwd(), "src", "backend", "db", "config.js");
    delete require.cache[require.resolve(configPath)];
    require(configPath);
    expect(process.env.DATABASE_URL).toBe("postgres://user:pass@host:5432/dbname");
  });
});
