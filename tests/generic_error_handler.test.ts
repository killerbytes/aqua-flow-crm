import { describe, expect, it } from "vitest";
import { handleServiceError } from "../src/backend/services/errorHandler";

describe("Generic Service Error Handler", () => {
  it("should normalize SequelizeUniqueConstraintError for phone field", () => {
    const err = {
      name: "SequelizeUniqueConstraintError",
      fields: { phone: "+639991112233" },
      errors: [{ path: "phone", message: "phone must be unique" }],
    };

    expect(() => handleServiceError(err)).toThrow(
      "A record with this phone number already exists.",
    );
  });

  it("should normalize SequelizeUniqueConstraintError for username field", () => {
    const err = {
      name: "SequelizeUniqueConstraintError",
      fields: { username: "cashier" },
      errors: [{ path: "username", message: "username must be unique" }],
    };

    expect(() => handleServiceError(err)).toThrow(
      "A record with this username already exists.",
    );
  });

  it("should normalize SequelizeForeignKeyConstraintError", () => {
    const err = {
      name: "SequelizeForeignKeyConstraintError",
      message: "foreign key constraint fails",
    };

    expect(() => handleServiceError(err)).toThrow(
      "Cannot process request: referenced item does not exist or is currently in use.",
    );
  });

  it("should preserve standard Error instances", () => {
    const customErr = new Error("User not authorized");
    expect(() => handleServiceError(customErr)).toThrow("User not authorized");
  });
});
