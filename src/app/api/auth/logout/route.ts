import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.delete("token");
  response.cookies.delete("aquaflow_token");
  return response;
}
