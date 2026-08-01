import { describe, it, expect } from "vitest";
import { requireAuth } from "../src/backend/auth/context";
import { UserRole } from "../src/lib/definitions";

describe("requireAuth GraphQL Authentication Guard", () => {
  it("should return user session when currentUser is present", () => {
    const userSession = {
      user_id: 1,
      name: "Admin User",
      email: "admin@aquaflow.com",
      role: UserRole.ADMIN,
    };

    const ctx = { currentUser: userSession };
    const user = requireAuth(ctx);

    expect(user).toBeDefined();
    expect(user.user_id).toBe(1);
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it("should return user session when user is present", () => {
    const userSession = {
      user_id: 2,
      name: "Staff User",
      email: "staff@aquaflow.com",
      role: UserRole.STAFF,
    };

    const ctx = { user: userSession };
    const user = requireAuth(ctx);

    expect(user).toBeDefined();
    expect(user.user_id).toBe(2);
  });

  it("should throw unauthenticated error when user_id is missing", () => {
    expect(() => requireAuth({})).toThrow("User not authenticated");
    expect(() => requireAuth({ user: undefined })).toThrow("User not authenticated");
  });
});
