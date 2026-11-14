import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService, parseDateRange } from "@/backend/services";
import { reportCsv, voidsTable } from "@/features/reports/definitions";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Every void and reversal in the range, one per row. */
export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const search = request.nextUrl.searchParams;
  const range = parseDateRange({ from: search.get("from"), to: search.get("to") });
  const report = await FinanceReportService.getVoidsAndReversals(range);

  return csvResponse(
    `voids-and-reversals-${range.from}-to-${range.to}.csv`,
    reportCsv(voidsTable, report.rows),
  );
}
