import { initDatabase } from "@/backend/db/database";
import { AuthenticationError, AuthService } from "@/backend/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await initDatabase();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const { token, user } = await AuthService.login(username, password);

    const response = NextResponse.json({
      message: "Login successful",
      user,
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
