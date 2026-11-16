import { describe, expect, it } from "vitest";
import {
  decodeToken,
  isSessionTooOld,
  sessionCookieOptions,
  verifyOrRefreshToken,
} from "../../../src/lib/auth.edge";
import { forgeClaims, nowInSeconds, readClaims } from "../../helpers/session";

const DAY = 60 * 60 * 24;
const user = { userId: 1, username: "admin", tokenVersion: 0 };

describe("Unit - Token Claims (Edge check)", () => {
  describe("signature", () => {
    it("should accept a token signed with the app's secret", async () => {
      const decoded = await decodeToken(await forgeClaims(user));

      expect(decoded).toMatchObject({ claims: user, expired: false });
    });

    it("should refuse a token signed with another secret", async () => {
      const forged = await forgeClaims(
        user,
        nowInSeconds() + 900,
        "someone-elses-secret",
      );
      expect(await decodeToken(forged)).toBeNull();
    });

    it("should refuse a token whose payload was edited after signing", async () => {
      const [header, , signature] = (await forgeClaims(user)).split(".");
      const payload = Buffer.from(
        JSON.stringify({ ...user, userId: 2, exp: nowInSeconds() + 900 }),
      ).toString("base64url");

      expect(await decodeToken(`${header}.${payload}.${signature}`)).toBeNull();
    });

    it("should refuse an unsigned token", async () => {
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const unsigned = `${encode({ alg: "none" })}.${encode({
        ...user,
        exp: nowInSeconds() + 900,
      })}.`;

      expect(await decodeToken(unsigned)).toBeNull();
    });

    it("should refuse text that isn't a token", async () => {
      expect(await decodeToken("not-a-real-token")).toBeNull();
      expect(await decodeToken("")).toBeNull();
    });
  });

  describe("claim types", () => {
    it.each([
      ["userId", "1"],
      ["userId", null],
      ["userId", { id: 1 }],
      ["tokenVersion", "0"],
      ["tokenVersion", true],
      ["sessionStart", "yesterday"],
      ["sessionStart", [1]],
    ])("should refuse a token whose %s is %j", async (claim, value) => {
      const token = await forgeClaims({ ...user, [claim]: value });
      expect(await decodeToken(token)).toBeNull();
    });

    it("should accept a token without the optional claims", async () => {
      const decoded = await decodeToken(await forgeClaims({ username: "old" }));
      expect(decoded?.claims).toMatchObject({ username: "old" });
    });

    it("should drop JWT bookkeeping and password fields from the claims", async () => {
      const token = await forgeClaims({
        ...user,
        passwordHash: "hash",
        password_hash: "hash",
      });

      const claims = (await decodeToken(token))!.claims;

      for (const field of ["exp", "iat", "passwordHash", "password_hash"]) {
        expect(claims).not.toHaveProperty(field);
      }
    });
  });

  describe("expiry and renewal", () => {
    it("should flag a token that expired inside the 7-day refresh window", async () => {
      const token = await forgeClaims(user, nowInSeconds() - 6 * DAY);
      expect(await decodeToken(token)).toMatchObject({ expired: true });
    });

    it("should refuse a token that expired more than 7 days ago", async () => {
      const token = await forgeClaims(user, nowInSeconds() - 8 * DAY);
      expect(await decodeToken(token)).toBeNull();
    });

    it("should hand back a replacement only for an expired token", async () => {
      const live = await verifyOrRefreshToken(await forgeClaims(user));
      expect(live).toMatchObject({ user });
      expect(live?.newToken).toBeUndefined();

      const sessionStart = nowInSeconds() - DAY;
      const expired = await verifyOrRefreshToken(
        await forgeClaims({ ...user, sessionStart }, nowInSeconds() - 3600),
      );
      expect(readClaims(expired!.newToken!)).toMatchObject({
        ...user,
        sessionStart,
      });
      expect(await decodeToken(expired!.newToken!)).toMatchObject({
        expired: false,
      });
    });
  });

  describe("session age", () => {
    it("should end a session 30 days after login", () => {
      expect(isSessionTooOld({ sessionStart: nowInSeconds() - 29 * DAY })).toBe(
        false,
      );
      expect(isSessionTooOld({ sessionStart: nowInSeconds() - 31 * DAY })).toBe(
        true,
      );
    });

    it("should not age a token from before sessions had a start", () => {
      expect(isSessionTooOld({})).toBe(false);
    });
  });

  describe("session cookie", () => {
    it("should be hidden from page scripts and last as long as renewal does", () => {
      expect(sessionCookieOptions()).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 7 * DAY,
      });
    });
  });
});
