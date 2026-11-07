import { sequelize } from "@/backend/db/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Used by Railway to decide whether a new deploy is ready to take traffic. */
export async function GET() {
  try {
    await sequelize.authenticate();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
