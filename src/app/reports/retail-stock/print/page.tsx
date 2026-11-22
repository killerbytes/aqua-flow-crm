import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseDateRange, RetailProductService } from "@/backend/services";
import {
  formatRange,
  rangeQuery,
  retailStockReport,
  retailStockSections,
} from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function RetailStockReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const range = parseDateRange(await searchParams);
  const report = await RetailProductService.getStockReport(range);

  return (
    <PrintableReport
      report={retailStockReport}
      sections={retailStockSections(report)}
      backQuery={rangeQuery(range)}
      filters={[formatRange(range.from, range.to)]}
    />
  );
}
