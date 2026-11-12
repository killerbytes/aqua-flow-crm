import { verifyOrRefreshToken } from "@/lib/auth";
import { UserRole } from "@/lib/definitions";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPageRedirect, PermissionAction } from "../rbac/permissions";

export interface UserSession {
  userId: number;
  name: string;
  username: string;
  role: UserRole;
}

export interface AuthContext {
  user?: UserSession;
}

export function requireAuth(ctx: AuthContext): UserSession {
  const user = ctx?.user;
  const userId = user?.userId;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return user;
}

/**
 * Session check for Server Component pages. Middleware runs on the Edge runtime
 * and cannot see the database, so this is what turns away deactivated users.
 * Call it outside any try/catch, because redirect() works by throwing.
 */
export async function requirePageUser(): Promise<UserSession> {
  const { user } = await getAuthContext();
  if (!user) redirect("/login");
  return user;
}

/**
 * requirePageUser plus a role check. Every page calls this, because hiding a
 * link or wrapping content in RoleGuard doesn't stop someone opening the URL.
 */
export async function requirePagePermission(
  permission: PermissionAction,
): Promise<UserSession> {
  const user = await requirePageUser();
  const target = getPageRedirect(user.role, permission);
  if (target) redirect(target);
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
        return { user: result.user };
      }
    }
  } catch (err) {
    console.error("getAuthContext error:", err);
  }

  return { user: undefined };
}
