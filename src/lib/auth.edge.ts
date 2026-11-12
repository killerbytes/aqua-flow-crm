import { SignJWT, jwtVerify } from "jose";

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

export interface VerifyResult {
  user: any;
  newToken?: string;
}

export async function signToken(
  user: any,
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
  claims: any;
  /** True when the token has expired but is still inside the refresh window. */
  expired: boolean;
}

/**
 * Checks a token signature and its age. Returns null for a token that is
 * forged, expired past the refresh window, or from a session that is too old.
 * It never touches the database, so it is safe on the Edge runtime.
 */
export async function decodeToken(token: string): Promise<DecodedToken | null> {
  let payload: any;
  let expired = false;

  try {
    ({ payload } = await jwtVerify(token, getSecretKey(), {
      clockTolerance: "10s",
    }));
  } catch (err: any) {
    if (err?.code !== "ERR_JWT_EXPIRED") return null;
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

  const { exp, iat, nbf, jti, passwordHash, password_hash, ...claims } =
    payload;
  if (isSessionTooOld(claims)) return null;
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
