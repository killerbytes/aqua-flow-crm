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
const REFRESH_TOKEN_EXPIRES_IN = "7d";

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
  return await new SignJWT(cleanUser)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function signRefreshToken(user: any): Promise<string> {
  return await signToken(user, REFRESH_TOKEN_EXPIRES_IN);
}

/**
 * Edge-runtime compatible token verification and refresh handler.
 * Completely decoupled from Node.js CJS dependencies and ORM libraries.
 */
export async function verifyOrRefreshToken(
  token: string,
): Promise<VerifyResult | null> {
  try {
    // 1. Verify token signature with standard clock tolerance (10s)
    const { payload } = await jwtVerify(token, getSecretKey(), {
      clockTolerance: "10s",
    });

    const { exp, iat, nbf, jti, passwordHash, password_hash, ...userPayload } =
      payload as any;
    return { user: userPayload };
  } catch (err: any) {
    // 2. Handle expired tokens within 7d refresh window
    if (err?.code === "ERR_JWT_EXPIRED") {
      try {
        const { payload } = await jwtVerify(token, getSecretKey(), {
          currentDate: new Date(0), // Inspect payload ignoring expiration
        });

        const {
          exp,
          iat,
          nbf,
          jti,
          passwordHash,
          password_hash,
          ...userPayload
        } = payload as any;
        const nowInSeconds = Math.floor(Date.now() / 1000);

        // Max 7 days after expiration
        if (exp && nowInSeconds - exp <= 60 * 60 * 24 * 7) {
          const newToken = await signToken(userPayload);
          return { user: userPayload, newToken };
        }
      } catch {
        return null;
      }
    }

    return null;
  }
}

export async function verifyToken(token: string): Promise<any | null> {
  const result = await verifyOrRefreshToken(token);
  return result?.user || null;
}
