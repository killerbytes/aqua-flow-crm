import { verifyToken } from "@/lib/auth";
import { UserRole } from "@/lib/definitions";
import { cookies, headers } from "next/headers";

export interface UserSession {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthContext {
  user?: UserSession;
  currentUser?: UserSession;
}

export function requireAuth(ctx: AuthContext): UserSession {
  const user = ctx?.currentUser || ctx?.user;
  if (!user?.userId) {
    throw new Error("User not authenticated");
  }
  return user;
}

/**
 * Server-side authentication context builder for Next.js Server Components and Server Actions.
 * Decodes user session from HTTP-only cookie or Authorization header.
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    let token: string | undefined;

    try {
      const cookieStore = await cookies();
      token =
        cookieStore.get("token")?.value ||
        cookieStore.get("aquaflow_token")?.value;
    } catch {
      // Not in Next.js request context
    }

    if (!token) {
      try {
        const headerList = await headers();
        const authHeader = headerList.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      } catch {
        // Headers unavailable
      }
    }

    if (token) {
      const decodedUser = verifyToken(token);
      if (decodedUser) {
        return { user: decodedUser, currentUser: decodedUser };
      }
    }
  } catch (err) {
    console.error("getAuthContext error:", err);
  }
  if (process.env.NODE_ENV !== "production") {
    return {
      currentUser: {
        userId: 1,
        name: "Admin User",
        email: "admin@aquaflow.com",
        role: UserRole.ADMIN,
      },
      user: {
        userId: 1,
        name: "Admin User",
        email: "admin@aquaflow.com",
        role: UserRole.ADMIN,
      },
    };
  }

  return { user: undefined, currentUser: undefined };
}
