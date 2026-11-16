import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService, parseDateRange } from "@/backend/services";
import {
  reportCsv,
  VOIDS_CSV_TABLES,
  type VoidsCsvTable,
} from "@/features/reports/definitions";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * One of the Voids report's tables, picked by the `table` param: every void and
 * reversal, one per row (the default), or the count for each person.
 */
export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const search = request.nextUrl.searchParams;
  const range = parseDateRange({ from: search.get("from"), to: search.get("to") });
  const name = search.get("table");
  const key: VoidsCsvTable =
    name && name in VOIDS_CSV_TABLES ? (name as VoidsCsvTable) : "list";

  const report = await FinanceReportService.getVoidsAndReversals(range);
  // Each table is paired with its own rows here, so the two can't be mixed up.
  const tables = VOIDS_CSV_TABLES;
  const csv: Record<VoidsCsvTable, () => string> = {
    list: () => reportCsv(tables.list.table, report.rows),
    users: () =>
      reportCsv(tables.users.table, report.byUser, report.byUserTotal),
  };

  return csvResponse(
    `${tables[key].name}-${range.from}-to-${range.to}.csv`,
    csv[key](),
  );
}
