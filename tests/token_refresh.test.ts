import { describe, expect, it } from "vitest";
import { signToken, verifyToken, verifyOrRefreshToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/definitions";

describe("JWT Token Automatic Refresh", () => {
  const userPayload: any = {
    userId: 1,
    name: "Admin User",
    username: "admin@aquaflow.com",
    role: UserRole.ADMIN,
  };

  it("should verify active non-expired tokens normally", async () => {
    const token = await signToken(userPayload, "15m");
    const verified = await verifyToken(token);

    expect(verified).toBeDefined();
    expect(verified?.userId).toBe(1);
    expect(verified?.username).toBe("admin@aquaflow.com");
  });

  it("should automatically refresh expired tokens within the 7-day refresh window", async () => {
    // Generate token expired 1 hour ago
    const expiredToken = await signToken(userPayload, "-1h");

    // Transparent verifyToken returns user seamlessly on refreshable expired token
    const user = await verifyToken(expiredToken);
    expect(user).toBeDefined();
    expect(user?.userId).toBe(1);

    // Enhanced verifyOrRefreshToken returning user and new token
    const result = await verifyOrRefreshToken(expiredToken);
    expect(result).toBeDefined();
    expect(result?.user).toBeDefined();
    expect(result?.user.userId).toBe(1);
    expect(result?.newToken).toBeDefined();
    expect(typeof result?.newToken).toBe("string");

    // The newly issued token should be active and valid
    if (result?.newToken) {
      const reVerified = await verifyToken(result.newToken);
      expect(reVerified).toBeDefined();
      expect(reVerified?.userId).toBe(1);
    }
  });

  it("should reject tokens with invalid signature", async () => {
    // Modify signature of valid token
    const validToken = await signToken(userPayload, "15m");
    const invalidToken = validToken.substring(0, validToken.length - 4) + "XXXX";

    const result = await verifyOrRefreshToken(invalidToken);
    expect(result).toBeNull();
    expect(await verifyToken(invalidToken)).toBeNull();
  });

  it("should reject tokens expired past the 7-day refresh window", async () => {
    // Expired 8 days ago
    const longExpiredToken = await signToken(userPayload, "-8d");
    const result = await verifyOrRefreshToken(longExpiredToken);
    expect(result).toBeNull();
    expect(await verifyToken(longExpiredToken)).toBeNull();
  });
});
