import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService, parseDateRange } from "@/backend/services";
import {
  formatRange,
  rangeQuery,
  voidsReport,
  voidsSections,
} from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function VoidsReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const range = parseDateRange(await searchParams);
  const report = await FinanceReportService.getVoidsAndReversals(range);

  return (
    <PrintableReport
      report={voidsReport}
      sections={voidsSections(report)}
      backQuery={rangeQuery(range)}
      filters={[formatRange(range.from, range.to)]}
    />
  );
}
