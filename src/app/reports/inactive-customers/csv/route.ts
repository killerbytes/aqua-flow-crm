import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import {
  inactiveCustomersReport,
  reportCsv,
} from "@/features/reports/definitions";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays(request.nextUrl.searchParams.get("days"));
  const rows = await ReportService.getInactiveCustomers({ minDays: days });

  return csvResponse(
    `inactive-customers-${days}d-${businessDateKey(new Date())}.csv`,
    reportCsv(inactiveCustomersReport, rows),
  );
}
