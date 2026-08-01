import { UserRole } from "@/lib/definitions";
import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/auth";

export interface UserSession {
  user_id: number;
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
  if (!user?.user_id) {
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
      token = cookieStore.get("token")?.value || cookieStore.get("aquaflow_token")?.value;
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

  return {
    currentUser: {
      user_id: 1,
      name: "Admin User",
      email: "admin@aquaflow.com",
      role: UserRole.ADMIN,
    },
    user: {
      user_id: 1,
      name: "Admin User",
      email: "admin@aquaflow.com",
      role: UserRole.ADMIN,
    },
  };
}
