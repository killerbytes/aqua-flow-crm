import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import {
  FinanceReportService,
  parseDateRange,
  parseSalesGroup,
} from "@/backend/services";
import DateRangeFilter from "@/features/reports/DateRangeFilter";
import {
  formatPeso,
  rangeQuery,
  salesReport,
  salesSections,
  SALES_CSV_TABLES,
} from "@/features/reports/definitions";
import GroupFilter from "@/features/reports/GroupFilter";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; group?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const range = parseDateRange(params);
  const group = parseSalesGroup(params.group);
  const report = await FinanceReportService.getSales(range, group);
  const query = rangeQuery(range, { group });

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={salesReport}
      sections={salesSections(report)}
      query={query}
      filters={
        <>
          <DateRangeFilter from={range.from} to={range.to} />
          <GroupFilter group={group} />
        </>
      }
      summary={`${report.periodTotal.orders} delivered orders, ${formatPeso(report.periodTotal.sales)} in sales, ${formatPeso(report.collectionTotal.total)} collected`}
      downloads={Object.entries(SALES_CSV_TABLES).map(([table, { table: def }]) => ({
        label: `${def.heading} CSV`,
        href: `/reports/sales/csv?${query}&table=${table}`,
      }))}
    />
  );
}
