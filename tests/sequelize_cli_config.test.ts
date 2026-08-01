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
  });
});
