/**
 * Generic Service Error Handler
 * Centralizes error handling and normalization for all backend services and ORM queries.
 */
const prop = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;

export function handleServiceError(error: unknown): never {
  if (!error) {
    throw new Error("An unexpected error occurred.");
  }
  const name = prop(error, "name");

  // Handle Unique Constraint Violations (PostgreSQL / SQLite / Sequelize)
  if (
    name === "SequelizeUniqueConstraintError" ||
    name === "UniqueConstraintError"
  ) {
    const fields = prop(error, "fields");
    const errors = prop(error, "errors");
    let fieldList: string[] = [];
    if (Array.isArray(fields)) {
      fieldList = fields.map(String);
    } else if (fields && typeof fields === "object") {
      fieldList = Object.keys(fields);
    }
    if (!fieldList.length && Array.isArray(errors)) {
      fieldList = errors
        .map((e: unknown) => prop(e, "path"))
        .filter(Boolean)
        .map(String);
    }

    const fieldStr = fieldList.join(", ");

    if (fieldStr.includes("phone")) {
      throw new Error("A record with this phone number already exists.");
    }
    if (fieldStr.includes("username")) {
      throw new Error("A record with this username already exists.");
    }
    if (fieldStr.includes("email")) {
      throw new Error("A record with this email address already exists.");
    }

    const item = fieldStr || "field value";
    throw new Error(`A record with this ${item} already exists.`);
  }

  // Handle Validation Errors
  if (
    name === "SequelizeValidationError" || name === "ValidationError"
  ) {
    const errors = prop(error, "errors");
    const first = Array.isArray(errors) ? prop(errors[0], "message") : undefined;
    const message = String(
      first || prop(error, "message") || "Validation error",
    );
    throw new Error(message.replace(/^Validation error:?\s*/i, ""));
  }

  // Handle Foreign Key Constraint Violations
  if (
    name === "SequelizeForeignKeyConstraintError" ||
    name === "ForeignKeyConstraintError"
  ) {
    throw new Error(
      "Cannot process request: referenced item does not exist or is currently in use.",
    );
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(
    typeof error === "string" ? error : "An unexpected error occurred.",
  );
}
