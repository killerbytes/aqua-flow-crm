import { verifyOrRefreshToken } from "@/lib/auth.edge";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Files served from public/. Root level only, so no route can match this pattern.
const PUBLIC_FILE = /^\/[^/]+\.(?:jpe?g|png|gif|svg|webp|ico|txt|xml|webmanifest)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow framework assets, api routes, public files, and the login page
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
  const result = await verifyOrRefreshToken(token);

  if (!result) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("token");
    return response;
  }
  const response = NextResponse.next();
  if (result.newToken) {
    response.cookies.set("token", result.newToken, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
