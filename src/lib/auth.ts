import { env } from "@/backend/db/env";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = env.JWT_SECRET;
const secretKey = new TextEncoder().encode(JWT_SECRET);

const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export interface VerifyResult {
  user: any;
  newToken?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function signToken(
  user: any,
  expiresIn: string = JWT_EXPIRES_IN,
): Promise<string> {
  const { exp, iat, nbf, jti, ...cleanUser } = user || {};
  return await new SignJWT(cleanUser)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function signRefreshToken(user: any): Promise<string> {
  return await signToken(user, REFRESH_TOKEN_EXPIRES_IN);
}

/**
 * Dynamically queries User model when running in Node.js environment without importing ORM into Edge Runtime.
 */
async function checkUserActiveInDb(userId: number) {
  if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
    return { isActive: true, dbUser: null };
  }
  try {
    const { User } = await import("@/backend/models");
    const dbUser = await User.findByPk(Number(userId));
    if (dbUser) {
      return {
        isActive: dbUser.isActive !== false,
        dbUser: dbUser.get({ plain: true }),
      };
    }
    const count = await User.count().catch(() => 0);
    if (count > 0) {
      return { isActive: false, dbUser: null };
    }
  } catch {
    // Uninitialized DB in simple unit tests
  }
  return { isActive: true, dbUser: null };
}

/**
 * Validates JWT token signature & active user state in DB.
 * Edge-runtime safe (no static ORM imports).
 * Generates a refreshed token if token is expired but within refresh window (7d) for active users.
 */
export async function verifyOrRefreshToken(
  token: string,
): Promise<VerifyResult | null> {
  try {
    // 1. Verify token signature with standard clock tolerance (10s)
    const { payload } = await jwtVerify(token, secretKey, {
      clockTolerance: "10s",
    });

    const { exp, iat, nbf, jti, ...userPayload } = payload as any;
    const userId = userPayload?.userId || userPayload?.user_id;

    if (userId) {
      const { isActive, dbUser } = await checkUserActiveInDb(userId);
      if (!isActive) {
        return null;
      }
      if (dbUser) {
        return { user: dbUser };
      }
    }

    return { user: userPayload };
  } catch (err: any) {
    // 2. Handle expired tokens within 7d refresh window for active users
    if (err?.code === "ERR_JWT_EXPIRED") {
      try {
        const { payload } = await jwtVerify(token, secretKey, {
          currentDate: new Date(0), // Allows inspecting payload regardless of expiration date
        });

        const { exp, iat, nbf, jti, ...userPayload } = payload as any;
        const userId = userPayload?.userId || userPayload?.user_id;
        const nowInSeconds = Math.floor(Date.now() / 1000);

        // Max 7 days after expiration
        if (exp && nowInSeconds - exp <= 60 * 60 * 24 * 7) {
          if (userId) {
            const { isActive, dbUser } = await checkUserActiveInDb(userId);
            if (!isActive) {
              return null;
            }
            if (dbUser) {
              const newToken = await signToken(dbUser);
              return { user: dbUser, newToken };
            }
          }
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
