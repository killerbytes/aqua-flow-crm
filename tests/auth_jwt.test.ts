import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, signToken, verifyToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/definitions";

describe("JWT & Password Auth Utilities", () => {
  it("should hash and verify passwords correctly", async () => {
    const rawPassword = "securePassword123";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(rawPassword);

    const isMatch = await comparePassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword("wrongPassword", hashed);
    expect(isWrongMatch).toBe(false);
  });

  it("should sign and verify JWT access tokens", async () => {
    const payload = {
      user_id: 1,
      name: "Admin User",
      email: "admin@aquaflow.com",
      role: UserRole.ADMIN,
    };

    const token = await signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.user_id).toBe(1);
    expect(decoded?.email).toBe("admin@aquaflow.com");
    expect(decoded?.role).toBe(UserRole.ADMIN);
  });
});
