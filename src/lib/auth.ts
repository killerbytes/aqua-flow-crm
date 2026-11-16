// Loads .env files in standalone scripts before any token is signed.
import "@/backend/db/env";
import bcrypt from "bcryptjs";
import { toPlain } from "@/backend/models/plain";
import {
  decodeToken,
  signToken,
  type TokenClaims,
  type VerifyResult,
} from "./auth.edge";

export { signToken };
export type { TokenClaims, VerifyResult };

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

/**
 * Looks the user up, importing the models lazily so this module can be loaded
 * without a database.
 */
async function checkUserActiveInDb(userId: number) {
  try {
    const { User } = await import("@/backend/models");
    const dbUser = await User.findByPk(Number(userId));
    if (dbUser) {
      return {
        isActive: dbUser.isActive !== false,
        dbUser: toPlain(dbUser),
      };
    }
    const count = await User.count().catch(() => 0);
    if (count > 0) {
      return { isActive: false, dbUser: null };
    }
  } catch {
    // Can't confirm the session, so production refuses it rather than letting a
    // revoked token through during a database failure. Simple unit tests have no
    // database.
    return { isActive: process.env.NODE_ENV !== "production", dbUser: null };
  }
  return { isActive: true, dbUser: null };
}

/** A token issued before versions existed counts as version 0. */
const isRevoked = (
  claims: { tokenVersion?: number },
  dbUser: { tokenVersion?: number } | null,
) => !!dbUser && (dbUser.tokenVersion ?? 0) !== (claims.tokenVersion ?? 0);

/** Tokens from before the claim was renamed carry the id as user_id. */
const userIdOf = (claims: TokenClaims) =>
  claims.userId ||
  (typeof claims.user_id === "number" ? claims.user_id : undefined);

/**
 * The Edge token check plus what only the database knows: whether the user is
 * still active and whether their sessions have been revoked. An expired token
 * inside the refresh window comes back with a replacement.
 */
export async function verifyOrRefreshToken(
  token: string,
): Promise<VerifyResult | null> {
  const decoded = await decodeToken(token);
  if (!decoded) return null;
  const { claims, expired } = decoded;

  let user: TokenClaims = claims;
  const userId = userIdOf(claims);
  if (userId) {
    const { isActive, dbUser } = await checkUserActiveInDb(userId);
    if (!isActive || isRevoked(claims, dbUser)) return null;
    if (dbUser) user = dbUser;
  }

  if (!expired) return { user };
  return {
    user,
    newToken: await signToken({ ...user, sessionStart: claims.sessionStart }),
  };
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  const result = await verifyOrRefreshToken(token);
  return result?.user || null;
}
