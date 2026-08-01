import { User } from "@/backend/models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "aquaflow_crm_super_secret_jwt_key_2026";
const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

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

export function signToken(
  user: User,
  expiresIn: string = JWT_EXPIRES_IN,
): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn } as any);
}

export function signRefreshToken(user: User): string {
  return signToken(user, REFRESH_TOKEN_EXPIRES_IN);
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (err) {
    return null;
  }
}
