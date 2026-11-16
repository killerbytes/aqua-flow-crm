import { describe, expect, it } from "vitest";
import { errorMessage } from "../../src/lib/errors";

describe("Unit - errorMessage", () => {
  it("should read the message of an Error or a subclass of one", () => {
    class ValidationError extends Error {}

    expect(errorMessage(new Error("Order not found"))).toBe("Order not found");
    expect(errorMessage(new ValidationError("Too many"))).toBe("Too many");
  });

  it("should take a thrown string as the message", () => {
    expect(errorMessage("Out of stock")).toBe("Out of stock");
  });

  it("should read a message from a plain object, as database drivers throw", () => {
    expect(errorMessage({ message: "duplicate key", code: "23505" })).toBe(
      "duplicate key",
    );
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["an object with no message", { code: 500 }],
    ["an object whose message isn't text", { message: { nested: true } }],
  ])("should give an empty message for %s", (_, thrown) => {
    expect(errorMessage(thrown)).toBe("");
  });
});
