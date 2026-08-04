import { User } from "@/backend/models";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET =
  process.env.JWT_SECRET || "aquaflow_crm_super_secret_jwt_key_2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export interface VerifyResult {
  user: User;
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

export async function verifyOrRefreshToken(
  token: string,
): Promise<VerifyResult | null> {
  try {
    // Clock tolerance of 7 days allows signature verification for expired tokens within 7 days
    const { payload } = await jwtVerify(token, secretKey, {
      clockTolerance: "7d",
    });

    const { exp, iat, nbf, jti, ...userPayload } = payload as any;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const isExpired = exp && exp <= nowInSeconds;

    if (isExpired) {
      console.log("newToken", isExpired);
      const newToken = await signToken(userPayload as User);
      return { user: userPayload as User, newToken };
    }

    return { user: userPayload as User };
  } catch (err) {
    console.log(err);

    return null;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  const result = await verifyOrRefreshToken(token);
  return result?.user || null;
}
