import { verifyOrRefreshToken, type TokenClaims } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/auth.edge";
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

const USER_ROLES: readonly unknown[] = Object.values(UserRole);

/**
 * Whether a verified token's user has everything a session needs. A token can
 * be signed correctly and still lack these, so its contents are checked before
 * anything relies on them.
 */
function isUserSession(user: TokenClaims): user is TokenClaims & UserSession {
  return (
    typeof user.userId === "number" &&
    Number.isInteger(user.userId) &&
    user.userId > 0 &&
    typeof user.name === "string" &&
    typeof user.username === "string" &&
    USER_ROLES.includes(user.role)
  );
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
    let cookieStore: Awaited<ReturnType<typeof cookies>> | undefined;

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
      // A token whose user is incomplete is treated as no session at all.
      if (result && isUserSession(result.user)) {
        if (result.newToken && cookieStore) {
          try {
            cookieStore.set("token", result.newToken, sessionCookieOptions());
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
