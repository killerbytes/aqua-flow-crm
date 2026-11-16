import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService } from "@/backend/services";
import { receivablesReport, reportCsv } from "@/features/reports/definitions";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const { rows, total } = await FinanceReportService.getReceivablesAging();

  return csvResponse(
    `money-owed-${businessDateKey(new Date())}.csv`,
    reportCsv(receivablesReport, rows, total),
  );
}
