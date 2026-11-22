import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthContext,
  requireAuth,
  requirePagePermission,
  requirePageUser,
} from "../../../src/backend/auth/context";
import { UserRole } from "../../../src/lib/definitions";
import {
  forgeClaims,
  nowInSeconds,
  readClaims,
  sessionUser,
} from "../../helpers/session";

/**
 * No database here, so the token's own claims are the session user. What the
 * database adds (deactivated users, revoked sessions) is covered in
 * tests/integration/session_revocation.test.ts.
 */
const request = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  authorization: undefined as string | undefined,
  setCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && request.cookie
        ? { name, value: request.cookie }
        : undefined,
    set: request.setCookie,
  }),
  headers: async () =>
    new Headers(
      request.authorization ? { authorization: request.authorization } : {},
    ),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const signInWith = async (claims: Record<string, unknown>) => {
  request.cookie = await forgeClaims(claims);
};

const signInAsRole = (role: UserRole) => signInWith(sessionUser(role));

describe("Unit - Auth Context", () => {
  beforeEach(() => {
    request.cookie = undefined;
    request.authorization = undefined;
    request.setCookie.mockReset();
  });

  describe("getAuthContext", () => {
    it("should have no user without a token", async () => {
      expect(await getAuthContext()).toEqual({ user: undefined });
    });

    it("should read the user from the token cookie", async () => {
      await signInAsRole(UserRole.CASHIER);

      const { user } = await getAuthContext();

      expect(user).toMatchObject(sessionUser(UserRole.CASHIER));
    });

    it("should fall back to a Bearer token when there is no cookie", async () => {
      request.authorization = `Bearer ${await forgeClaims(
        sessionUser(UserRole.MANAGER),
      )}`;

      expect((await getAuthContext()).user?.role).toBe(UserRole.MANAGER);
    });

    it("should ignore an Authorization header that isn't a Bearer token", async () => {
      request.authorization = `Basic ${await forgeClaims(
        sessionUser(UserRole.ADMIN),
      )}`;

      expect((await getAuthContext()).user).toBeUndefined();
    });

    it("should have no user for a token that doesn't verify", async () => {
      request.cookie = await forgeClaims(
        sessionUser(UserRole.ADMIN),
        nowInSeconds() + 900,
        "another-secret",
      );

      expect((await getAuthContext()).user).toBeUndefined();
    });

    const admin = sessionUser(UserRole.ADMIN);
    it.each([
      ["no user id", { ...admin, userId: undefined }],
      ["a user id of zero", { ...admin, userId: 0 }],
      ["a negative user id", { ...admin, userId: -1 }],
      ["a fractional user id", { ...admin, userId: 1.5 }],
      ["no name", { ...admin, name: undefined }],
      ["no username", { ...admin, username: undefined }],
      ["no role", { ...admin, role: undefined }],
      ["a role that doesn't exist", { ...admin, role: "SUPERUSER" }],
      ["a role in the wrong case", { ...admin, role: "admin" }],
    ])(
      "should treat a signed token with %s as no session",
      async (_, claims) => {
        await signInWith(claims);
        expect((await getAuthContext()).user).toBeUndefined();
      },
    );

    it("should renew an expired token into the cookie", async () => {
      request.cookie = await forgeClaims(
        sessionUser(UserRole.ADMIN),
        nowInSeconds() - 60,
      );

      const { user } = await getAuthContext();

      expect(user?.userId).toBe(1);
      expect(request.setCookie).toHaveBeenCalledTimes(1);
      const [name, token, options] = request.setCookie.mock.calls[0];
      expect(name).toBe("token");
      expect(readClaims(token).exp).toBeGreaterThan(nowInSeconds());
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax" });
    });

    it("should not touch the cookie for a token that is still valid", async () => {
      await signInAsRole(UserRole.ADMIN);
      await getAuthContext();
      expect(request.setCookie).not.toHaveBeenCalled();
    });

    it("should keep the session when the cookie can't be written while rendering", async () => {
      request.cookie = await forgeClaims(
        sessionUser(UserRole.ADMIN),
        nowInSeconds() - 60,
      );
      request.setCookie.mockImplementation(() => {
        throw new Error("Cookies can only be modified in a Server Action");
      });

      expect((await getAuthContext()).user?.userId).toBe(1);
    });
  });

  describe("requireAuth", () => {
    it("should return the user of a signed-in context", () => {
      const user = sessionUser(UserRole.ADMIN);
      expect(requireAuth({ user })).toBe(user);
    });

    it("should throw without a user", () => {
      expect(() => requireAuth({})).toThrow("User not authenticated");
    });
  });

  describe("requirePageUser", () => {
    it("should send a visitor with no session to login", async () => {
      await expect(requirePageUser()).rejects.toThrow("REDIRECT /login");
    });

    it("should send a visitor whose token has no complete user to login", async () => {
      await signInWith({ userId: 1 });
      await expect(requirePageUser()).rejects.toThrow("REDIRECT /login");
    });

    it("should return the signed-in user", async () => {
      await signInAsRole(UserRole.DELIVERY);
      expect((await requirePageUser()).role).toBe(UserRole.DELIVERY);
    });
  });

  describe("requirePagePermission", () => {
    it("should return the user when the role may open the page", async () => {
      await signInAsRole(UserRole.MANAGER);

      const user = await requirePagePermission("VIEW_USERS");

      expect(user).toMatchObject(sessionUser(UserRole.MANAGER));
    });

    it.each([
      [UserRole.CASHIER, "VIEW_USERS", "/"],
      [UserRole.DELIVERY, "VIEW_USERS", "/orders"],
      [UserRole.DELIVERY, "VIEW_DASHBOARD", "/orders"],
      [UserRole.MANAGER, "EXPORT_REPORTS", "/"],
      [UserRole.CASHIER, "EXPORT_REPORTS", "/"],
    ] as const)(
      "should send a %s away from a %s page to %s",
      async (role, permission, target) => {
        await signInAsRole(role);
        await expect(requirePagePermission(permission)).rejects.toThrow(
          `REDIRECT ${target}`,
        );
      },
    );

    it("should send a visitor with no session to login, whatever the page", async () => {
      await expect(requirePagePermission("VIEW_ORDERS")).rejects.toThrow(
        "REDIRECT /login",
      );
    });
  });
});
