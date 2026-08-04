import { verifyOrRefreshToken } from "@/lib/auth";
import { UserRole } from "@/lib/definitions";
import { cookies, headers } from "next/headers";

export interface UserSession {
  userId: number;
  name: string;
  username: string;
  role: UserRole;
}

export interface AuthContext {
  user?: UserSession;
  currentUser?: UserSession;
}

export function requireAuth(ctx: AuthContext): UserSession {
  const user = ctx?.currentUser || ctx?.user;
  const userId = user?.userId;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return user;
}

/**
 * Server-side authentication context builder for Next.js Server Components and Server Actions.
 * Decodes user session from HTTP-only cookie or Authorization header.
 * Automatically refreshes token if expired within acceptable refresh window.
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    let token: string | undefined;
    let cookieStore: any;

    try {
      cookieStore = await cookies();
      token = cookieStore.get("token")?.value;
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
      const result = await verifyOrRefreshToken(token);
      if (result) {
        if (result.newToken && cookieStore) {
          try {
            cookieStore.set("token", result.newToken, {
              httpOnly: true,
              path: "/",
              secure: process.env.NODE_ENV === "production",
              maxAge: 60 * 60 * 24 * 7,
              sameSite: "lax",
            });
          } catch {
            // Ignore if cookie store is read-only in rendering phase
          }
        }
        return { user: result.user, currentUser: result.user };
      }
    }
  } catch (err) {
    console.error("getAuthContext error:", err);
  }

  return { user: undefined, currentUser: undefined };
}
