import { describe, expect, it } from "vitest";
import { signToken, verifyOrRefreshToken } from "../src/lib/auth.edge";
import { UserRole } from "../src/lib/definitions";

describe("Standalone Edge Auth Module (Zero ORM Bundle Dependency)", () => {
  const edgeUser = {
    userId: 202,
    name: "Edge User",
    username: "edge@aquaflow.com",
    role: UserRole.CASHIER,
  };

  it("should verify non-expired token in Edge environment", async () => {
    const token = await signToken(edgeUser, "15m");
    const result = await verifyOrRefreshToken(token);

    expect(result).not.toBeNull();
    expect(result?.user.userId).toBe(202);
    expect(result?.user.username).toBe("edge@aquaflow.com");
  });

  it("should refresh expired token within 7 days in Edge environment", async () => {
    const expiredToken = await signToken(edgeUser, "-1h");
    const result = await verifyOrRefreshToken(expiredToken);

    expect(result).not.toBeNull();
    expect(result?.user.userId).toBe(202);
    expect(result?.newToken).toBeDefined();
    expect(typeof result?.newToken).toBe("string");
  });

  it("should reject token expired past 7 days in Edge environment", async () => {
    const longExpiredToken = await signToken(edgeUser, "-8d");
    const result = await verifyOrRefreshToken(longExpiredToken);

    expect(result).toBeNull();
  });
});
