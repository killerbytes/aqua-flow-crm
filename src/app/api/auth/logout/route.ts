import { initDatabase } from "@/backend/db/database";
import { AuthService } from "@/backend/services/auth.service";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // A failure here must not stop the cookie being cleared below.
  try {
    await initDatabase();
    const token = request.cookies.get("token")?.value;
    const user = token ? await verifyToken(token) : null;
    if (user?.userId) {
      await AuthService.revokeSessions(user.userId);
    }
  } catch (err) {
    console.error("Failed to revoke sessions on logout:", err);
  }

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.delete("token");
  response.cookies.delete("aquaflow_token");
  return response;
}
