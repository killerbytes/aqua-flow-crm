import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as logout } from "../../src/app/api/auth/logout/route";
import { User } from "../../src/backend/models";
import { AuthService } from "../../src/backend/services/auth.service";
import * as edge from "../../src/lib/auth.edge";
import { signToken, verifyOrRefreshToken } from "../../src/lib/auth";
import { UserRole } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const DAY = 60 * 60 * 24;
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "super_secret_jwt_key",
);

const newUser = async (username: string) => {
  const user = await AuthService.createUser({
    name: username,
    username,
    password: "password123",
    role: UserRole.CASHIER,
  });
  return user as { userId: number; username: string };
};

const login = async (username: string) =>
  (await AuthService.login(username, "password123")).token;

const sessionIsValid = async (token: string) =>
  (await verifyOrRefreshToken(token)) !== null;

const forgeClaims = (
  claims: Record<string, unknown>,
  expiresAt: number = Math.floor(Date.now() / 1000) + 900,
) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
    .setExpirationTime(expiresAt)
    .sign(secret);

describe("Integration - Session Revocation", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should accept a fresh session", async () => {
    const { username } = await newUser("fresh");
    expect(await sessionIsValid(await login(username))).toBe(true);
  });

  describe("changing a password", () => {
    it("should end the user's existing sessions", async () => {
      const { userId, username } = await newUser("passwordchange");
      const token = await login(username);

      await AuthService.changePassword(userId, {
        password: "newpassword1",
        confirmPassword: "newpassword1",
      });

      expect(await sessionIsValid(token)).toBe(false);
    });

    it("should still allow logging in with the new password", async () => {
      const { userId, username } = await newUser("passwordchange2");
      await AuthService.changePassword(userId, {
        password: "newpassword1",
        confirmPassword: "newpassword1",
      });

      const { token } = await AuthService.login(username, "newpassword1");

      expect(await sessionIsValid(token)).toBe(true);
    });

    it("should not affect other users", async () => {
      const changed = await newUser("passwordchange3");
      const other = await newUser("bystander");
      const otherToken = await login(other.username);

      await AuthService.changePassword(changed.userId, {
        password: "newpassword1",
        confirmPassword: "newpassword1",
      });

      expect(await sessionIsValid(otherToken)).toBe(true);
    });
  });

  describe("logging out", () => {
    const logoutWith = (token?: string) =>
      logout(
        new NextRequest("http://localhost/api/auth/logout", {
          method: "POST",
          headers: token ? { cookie: `token=${token}` } : {},
        }),
      );

    it("should end the session, so a copied token stops working", async () => {
      const { username } = await newUser("logout");
      const token = await login(username);

      const response = await logoutWith(token);

      expect(response.status).toBe(200);
      expect(await sessionIsValid(token)).toBe(false);
    });

    it("should end the user's sessions on other devices too", async () => {
      const { username } = await newUser("logoutdevices");
      const laptop = await login(username);
      const phone = await login(username);

      await logoutWith(laptop);

      expect(await sessionIsValid(phone)).toBe(false);
    });

    it("should allow logging back in", async () => {
      const { username } = await newUser("logoutagain");
      await logoutWith(await login(username));

      expect(await sessionIsValid(await login(username))).toBe(true);
    });

    it("should clear the cookie with no token or an invalid one", async () => {
      for (const response of [
        await logoutWith(),
        await logoutWith("not-a-real-token"),
      ]) {
        expect(response.status).toBe(200);
        expect(response.headers.get("set-cookie")).toContain("token=");
      }
    });
  });

  describe("deactivating", () => {
    it("should end sessions and keep them dead after reactivating", async () => {
      const { userId, username } = await newUser("deactivated");
      const token = await login(username);
      const form = {
        name: username,
        username,
        role: UserRole.CASHIER,
      };

      await AuthService.updateUser(userId, { ...form, isActive: false });
      expect(await sessionIsValid(token)).toBe(false);

      await AuthService.updateUser(userId, { ...form, isActive: true });
      expect(await sessionIsValid(token)).toBe(false);
      expect(await sessionIsValid(await login(username))).toBe(true);
    });

    it("should not end sessions on an ordinary profile edit", async () => {
      const { userId, username } = await newUser("profileedit");
      const token = await login(username);

      await AuthService.updateUser(userId, {
        name: "New Name",
        username,
        role: UserRole.CASHIER,
      });

      expect(await sessionIsValid(token)).toBe(true);
    });
  });

  describe("token renewal", () => {
    const now = () => Math.floor(Date.now() / 1000);
    const expiredAnHourAgo = () => now() - 3600;

    it("should renew an expired token and keep the session's start", async () => {
      const { userId, username } = await newUser("renewal");
      const sessionStart = now() - DAY;
      const expired = await forgeClaims(
        { userId, username, tokenVersion: 0, sessionStart },
        expiredAnHourAgo(),
      );

      const result = await verifyOrRefreshToken(expired);
      expect(result?.newToken).toBeDefined();

      const claims = JSON.parse(
        Buffer.from(result!.newToken!.split(".")[1], "base64url").toString(),
      );
      expect(claims.sessionStart).toBe(sessionStart);
      expect(claims.tokenVersion).toBe(0);
      expect(claims).not.toHaveProperty("passwordHash");
    });

    it("should not renew a revoked token", async () => {
      const { userId, username } = await newUser("renewalrevoked");
      const expired = await forgeClaims(
        { userId, username, tokenVersion: 0 },
        expiredAnHourAgo(),
      );

      await AuthService.revokeSessions(userId);

      expect(await verifyOrRefreshToken(expired)).toBeNull();
    });

    it.each([
      ["the app", verifyOrRefreshToken],
      ["the middleware", edge.verifyOrRefreshToken],
    ])("should end sessions older than 30 days in %s", async (_, verify) => {
      const { userId } = await newUser(`old${_.replace(/\W/g, "")}`);
      const old = now() - 31 * DAY;

      const active = await forgeClaims({
        userId,
        tokenVersion: 0,
        sessionStart: old,
      });
      expect(await verify(active)).toBeNull();

      const expired = await forgeClaims(
        { userId, tokenVersion: 0, sessionStart: old },
        expiredAnHourAgo(),
      );
      expect(await verify(expired)).toBeNull();
    });

    it("should keep sessions just inside 30 days", async () => {
      const { userId } = await newUser("almostold");
      const token = await forgeClaims({
        userId,
        tokenVersion: 0,
        sessionStart: now() - 29 * DAY,
      });

      expect(await sessionIsValid(token)).toBe(true);
    });
  });

  describe("tokens issued before this change", () => {
    it("should stay valid, so deploying logs nobody out", async () => {
      const { userId, username } = await newUser("legacy");
      const legacy = await forgeClaims({ userId, username });

      expect(await sessionIsValid(legacy)).toBe(true);
    });

    it("should still be revocable", async () => {
      const { userId, username } = await newUser("legacyrevoked");
      const legacy = await forgeClaims({ userId, username });

      await AuthService.revokeSessions(userId);

      expect(await sessionIsValid(legacy)).toBe(false);
    });
  });

  it("should keep the password hash out of the session user", async () => {
    const { username } = await newUser("nohash");
    const token = await login(username);
    const result = await verifyOrRefreshToken(token);

    expect(result?.user).not.toHaveProperty("passwordHash");
    const user = await User.findOne({ where: { username } });
    expect(user?.get({ plain: true })).not.toHaveProperty("passwordHash");
  });
});
