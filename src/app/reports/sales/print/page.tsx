import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import {
  FinanceReportService,
  parseDateRange,
  parseSalesGroup,
} from "@/backend/services";
import {
  formatRange,
  rangeQuery,
  salesReport,
  salesSections,
} from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function SalesReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; group?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const range = parseDateRange(params);
  const group = parseSalesGroup(params.group);
  const report = await FinanceReportService.getSales(range, group);

  return (
    <PrintableReport
      report={salesReport}
      sections={salesSections(report)}
      backQuery={rangeQuery(range, { group })}
      filters={[`${formatRange(range.from, range.to)}, by ${group}`]}
    />
  );
}
