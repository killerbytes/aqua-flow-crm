import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService, parseDateRange } from "@/backend/services";
import DateRangeFilter from "@/features/reports/DateRangeFilter";
import {
  rangeQuery,
  VOIDS_CSV_TABLES,
  voidsReport,
  voidsSections,
} from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function VoidsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const range = parseDateRange(await searchParams);
  const report = await FinanceReportService.getVoidsAndReversals(range);
  const query = rangeQuery(range);

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={voidsReport}
      sections={voidsSections(report)}
      query={query}
      downloads={Object.entries(VOIDS_CSV_TABLES).map(([table, { table: def }]) => ({
        label: `${def.heading} CSV`,
        href: `/reports/voids/csv?${query}&table=${table}`,
      }))}
      filters={<DateRangeFilter from={range.from} to={range.to} />}
      summary={`${report.rows.length} ${report.rows.length === 1 ? "void or reversal" : "voids and reversals"}`}
    />
  );
}
