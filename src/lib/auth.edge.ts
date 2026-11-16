import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEV_FALLBACK_SECRET = "super_secret_jwt_key";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
  if (
    secret === DEV_FALLBACK_SECRET &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("JWT_SECRET must be set in production");
  }
  return new TextEncoder().encode(secret);
}

const JWT_EXPIRES_IN = "15m";
/** How long after expiry a token can still be traded for a new one. */
const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Tokens renew themselves, so without this limit a session in regular use would
 * never end. Tokens issued before sessionStart existed have none, and get one
 * when they next renew.
 */
export function isSessionTooOld(claims: { sessionStart?: number }): boolean {
  return (
    !!claims.sessionStart &&
    Math.floor(Date.now() / 1000) - claims.sessionStart >
      SESSION_MAX_AGE_SECONDS
  );
}

/** Options for the session cookie, shared by everything that sets it. */
export const sessionCookieOptions = () => ({
  httpOnly: true,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: REFRESH_WINDOW_SECONDS,
  sameSite: "lax" as const,
});

/**
 * What a session token carries. The fields named here are the ones the token
 * checks read, and decodeToken confirms their types. Everything else is the
 * rest of the user record, carried along but not verified.
 */
export interface TokenClaims {
  userId?: number;
  /** Compared with users.token_version to tell whether sessions were revoked. */
  tokenVersion?: number;
  /** When the user logged in, in seconds since the epoch. */
  sessionStart?: number;
  [claim: string]: unknown;
}

export interface VerifyResult {
  user: TokenClaims;
  newToken?: string;
}

const isMissingOrNumber = (value: unknown): value is number | undefined =>
  value === undefined || (typeof value === "number" && Number.isFinite(value));

/** Null for a payload whose checked fields are not the numbers they should be. */
function toTokenClaims(payload: Record<string, unknown>): TokenClaims | null {
  const { userId, tokenVersion, sessionStart } = payload;
  if (
    !isMissingOrNumber(userId) ||
    !isMissingOrNumber(tokenVersion) ||
    !isMissingOrNumber(sessionStart)
  ) {
    return null;
  }
  return { ...payload, userId, tokenVersion, sessionStart };
}

export async function signToken(
  user: TokenClaims,
  expiresIn: string = JWT_EXPIRES_IN,
): Promise<string> {
  const { exp, iat, nbf, jti, passwordHash, password_hash, ...cleanUser } =
    user || {};
  return await new SignJWT({
    ...cleanUser,
    sessionStart: cleanUser.sessionStart ?? Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export interface DecodedToken {
  /** The token payload without JWT bookkeeping or password fields. */
  claims: TokenClaims;
  /** True when the token has expired but is still inside the refresh window. */
  expired: boolean;
}

const isExpiryError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ERR_JWT_EXPIRED";

/**
 * Checks a token signature and its age. Returns null for a token that is
 * forged, malformed, expired past the refresh window, or from a session that
 * is too old. It never touches the database, so it is safe on the Edge runtime.
 */
export async function decodeToken(token: string): Promise<DecodedToken | null> {
  let payload: JWTPayload;
  let expired = false;

  try {
    ({ payload } = await jwtVerify(token, getSecretKey(), {
      clockTolerance: "10s",
    }));
  } catch (err) {
    if (!isExpiryError(err)) return null;
    try {
      // Epoch as the current date reads the payload whatever its expiry.
      ({ payload } = await jwtVerify(token, getSecretKey(), {
        currentDate: new Date(0),
      }));
    } catch {
      return null;
    }
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!payload.exp || nowInSeconds - payload.exp > REFRESH_WINDOW_SECONDS) {
      return null;
    }
    expired = true;
  }

  const { exp, iat, nbf, jti, passwordHash, password_hash, ...rest } = payload;
  const claims = toTokenClaims(rest);
  if (!claims || isSessionTooOld(claims)) return null;
  return { claims, expired };
}

/**
 * Token check for the proxy. An expired token inside the refresh window comes
 * back with a replacement.
 */
export async function verifyOrRefreshToken(
  token: string,
): Promise<VerifyResult | null> {
  const decoded = await decodeToken(token);
  if (!decoded) return null;
  const { claims, expired } = decoded;
  return expired
    ? { user: claims, newToken: await signToken(claims) }
    : { user: claims };
}
