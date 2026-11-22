import { SignJWT } from "jose";
import { vi } from "vitest";
import * as authContext from "../../src/backend/auth/context";
import { UserRole } from "../../src/lib/definitions";

/** A complete session user, as getAuthContext returns one. */
export const sessionUser = (role: UserRole, userId = 1) => ({
  userId,
  name: "Test User",
  username: "testuser",
  role,
});

/** Makes Server Actions see a signed-in user with this role. */
export const signInAs = (role: UserRole, userId = 1) =>
  vi
    .spyOn(authContext, "getAuthContext")
    .mockResolvedValue({ user: sessionUser(role, userId) });

/** Makes Server Actions see no session. */
export const signOut = () =>
  vi.spyOn(authContext, "getAuthContext").mockResolvedValue({ user: undefined });

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

export const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Signs any claims at all, which signToken won't do: it always adds a
 * sessionStart and can't make an expired token.
 */
export const forgeClaims = (
  claims: Record<string, unknown>,
  expiresAt: number = nowInSeconds() + 900,
  secret: string = JWT_SECRET,
) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.min(nowInSeconds(), expiresAt) - 60)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));

/** The payload of a token, without checking its signature. */
export const readClaims = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
