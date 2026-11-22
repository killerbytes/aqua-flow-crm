import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { parseDateRange, RetailProductService } from "@/backend/services";
import DateRangeFilter from "@/features/reports/DateRangeFilter";
import {
  rangeQuery,
  RETAIL_STOCK_CSV_TABLES,
  retailStockReport,
  retailStockSections,
} from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function RetailStockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const range = parseDateRange(await searchParams);
  const report = await RetailProductService.getStockReport(range);
  const query = rangeQuery(range);
  const { total } = report;

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={retailStockReport}
      sections={retailStockSections(report)}
      query={query}
      downloads={Object.entries(RETAIL_STOCK_CSV_TABLES).map(
        ([table, { table: def }]) => ({
          label: `${def.heading} CSV`,
          href: `/reports/retail-stock/csv?${query}&table=${table}`,
        }),
      )}
      filters={<DateRangeFilter from={range.from} to={range.to} />}
      summary={`${total.restocked} restocked, ${total.sold} sold, ${total.returned} returned, ${total.writtenOff} written off`}
    />
  );
}
