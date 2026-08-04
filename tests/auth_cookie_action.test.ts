process.env.IS_SEEDING = "true";

import { describe, it, expect, beforeAll, vi } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { loginAction } from "../src/backend/actions/auth.actions";
import { User } from "../src/backend/models";
import { comparePassword } from "../src/lib/auth";

// Mock next/headers
const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    set: mockCookieSet,
    get: vi.fn(),
  })),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Login Action Cookie Attachment Unit Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    process.env.IS_SEEDING = "true";
    await seedDatabase({ isTest: true, force: true, refDate });
  });

  it("should set HTTP cookie using next/headers cookies() on successful login", async () => {
    mockCookieSet.mockClear();

    const result = await loginAction("admin", "pass");

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.username).toBe("admin");

    // Verify cookie was set via next/headers cookieStore.set
    expect(mockCookieSet).toHaveBeenCalledTimes(1);
    expect(mockCookieSet).toHaveBeenCalledWith(
      "token",
      result.token,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      })
    );
  });

  it("should throw error and not set cookie on invalid credentials", async () => {
    mockCookieSet.mockClear();

    await expect(loginAction("admin", "wrongpassword")).rejects.toThrow();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
