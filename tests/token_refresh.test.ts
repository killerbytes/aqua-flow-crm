import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase } from "../src/backend/db/database";
import { seedDatabase } from "../src/backend/db/seed";
import { User } from "../src/backend/models";
import { signToken, verifyOrRefreshToken, verifyToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/definitions";

describe("JWT Token Automatic Refresh", () => {
  let userPayload: any;

  beforeAll(async () => {
    await initDatabase();
    await seedDatabase({ clean: true, testCount: 5 });
    const adminUser = await User.findOne({ where: { role: UserRole.ADMIN } });
    if (adminUser) {
      userPayload = adminUser.get({ plain: true });
    } else {
      userPayload = {
        userId: 1,
        name: "Admin User",
        username: "admin@aquaflow.com",
        role: UserRole.ADMIN,
      };
    }
  });

  it("should verify active non-expired tokens normally", async () => {
    const token = await signToken(userPayload, "15m");
    const verified = await verifyToken(token);

    expect(verified).toBeDefined();
    expect(verified?.userId).toBe(userPayload.userId);
    expect(verified?.username).toBe(userPayload.username);
  });

  it("should automatically refresh expired tokens within the 7-day refresh window", async () => {
    // Generate token expired 1 hour ago
    const expiredToken = await signToken(userPayload, "-1h");

    // Transparent verifyToken returns user seamlessly on refreshable expired token
    const user = await verifyToken(expiredToken);
    expect(user).toBeDefined();
    expect(user?.userId).toBe(userPayload.userId);

    // Enhanced verifyOrRefreshToken returning user and new token
    const result = await verifyOrRefreshToken(expiredToken);
    expect(result).toBeDefined();
    expect(result?.user).toBeDefined();
    expect(result?.user.userId).toBe(userPayload.userId);
    expect(result?.newToken).toBeDefined();
    expect(typeof result?.newToken).toBe("string");

    // The newly issued token should be active and valid
    if (result?.newToken) {
      const reVerified = await verifyToken(result.newToken);
      expect(reVerified).toBeDefined();
      expect(reVerified?.userId).toBe(userPayload.userId);
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
