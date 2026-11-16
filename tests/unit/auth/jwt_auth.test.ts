import { describe, expect, it } from "vitest";
import {
  comparePassword,
  hashPassword,
  signToken,
  verifyToken,
} from "../../../src/lib/auth";
import { UserRole } from "../../../src/lib/definitions";
import { readClaims } from "../../helpers/session";

describe("Unit - JWT & Password Auth Utilities", () => {
  it("should hash and verify passwords correctly", async () => {
    const rawPassword = "securePassword123";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);
    expect(await comparePassword(rawPassword, hashed)).toBe(true);
    expect(await comparePassword("wrongPassword", hashed)).toBe(false);
  });

  it("should salt hashes, so the same password never hashes the same twice", async () => {
    expect(await hashPassword("samePassword")).not.toBe(
      await hashPassword("samePassword"),
    );
  });

  it("should sign a session user and read it back", async () => {
    const user = {
      userId: 1,
      name: "Admin User",
      username: "admin",
      role: UserRole.ADMIN,
      tokenVersion: 0,
    };

    const decoded = await verifyToken(await signToken(user));

    expect(decoded).toMatchObject(user);
  });

  it("should stamp a new token with when the session started", async () => {
    const before = Math.floor(Date.now() / 1000);
    const claims = readClaims(await signToken({ userId: 1 }));

    expect(claims.sessionStart).toBeGreaterThanOrEqual(before);
    expect(claims.exp).toBe((claims.iat as number) + 15 * 60);
  });

  it("should keep an existing session start when re-signing", async () => {
    const claims = readClaims(await signToken({ userId: 1, sessionStart: 1234 }));
    expect(claims.sessionStart).toBe(1234);
  });

  it("should never put a password hash in a token", async () => {
    const claims = readClaims(
      await signToken({ userId: 1, passwordHash: "a", password_hash: "b" }),
    );
    expect(claims).not.toHaveProperty("passwordHash");
    expect(claims).not.toHaveProperty("password_hash");
  });

  it("should refuse a token that isn't one", async () => {
    expect(await verifyToken("not-a-real-token")).toBeNull();
    expect(await verifyToken("")).toBeNull();
  });
});
