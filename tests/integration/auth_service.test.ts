import { beforeAll, describe, expect, it } from "vitest";
import { loginAction } from "../../src/backend/actions/auth.actions";
import { AuthService } from "../../src/backend/services/auth.service";
import { UserRole } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Auth Service & Server Actions", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should authenticate valid user credentials successfully", async () => {
    const result = await AuthService.login("admin", "pass");
    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user.username).toBe("admin");
    expect(result.user.role).toBe(UserRole.ADMIN);
  });

  it("should reject authentication for invalid password", async () => {
    await expect(AuthService.login("admin", "wrongpass")).rejects.toThrow();
  });

  it("should return failure result from loginAction on invalid credentials without throwing", async () => {
    const result = await loginAction("admin", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email or password");
  });

  it("should return success result from loginAction on valid credentials", async () => {
    const result = await loginAction("admin", "pass");
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
  });

  it("should create new users and prevent duplicate usernames", async () => {
    const newUser = await AuthService.createUser({
      name: "Test Cashier",
      username: "testcashier",
      password: "password123",
      role: UserRole.CASHIER,
    });

    expect(newUser).toBeDefined();
    expect(newUser.username).toBe("testcashier");

    await expect(
      AuthService.createUser({
        name: "Duplicate Cashier",
        username: "testcashier",
        password: "password123",
        role: UserRole.CASHIER,
      }),
    ).rejects.toThrow();
  });
});
