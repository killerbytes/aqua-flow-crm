import { describe, expect, it } from "vitest";
import { signToken, verifyOrRefreshToken, verifyToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/definitions";

describe("Edge-Compatible Auth Utilities (No Static ORM Imports)", () => {
  const mockUserPayload = {
    userId: 101,
    name: "Edge Test User",
    username: "edge_user",
    role: UserRole.CASHIER,
  };

  it("should sign and verify token without throwing ORM / deprecation errors", async () => {
    const token = await signToken(mockUserPayload);
    expect(token).toBeDefined();

    const result = await verifyOrRefreshToken(token);
    expect(result).not.toBeNull();
    expect(result?.user.username).toBe("edge_user");
  });

  it("should verify token via verifyToken helper", async () => {
    const token = await signToken(mockUserPayload);
    const user = await verifyToken(token);
    expect(user).not.toBeNull();
    expect(user?.userId).toBe(101);
  });
});
