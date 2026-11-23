import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import BarangayFilter from "@/features/reports/BarangayFilter";
import DaysFilter from "@/features/reports/DaysFilter";
import { inactiveCustomersReport } from "@/features/reports/definitions";
import {
  inactiveReportView,
  type InactiveReportParams,
} from "@/features/reports/inactive";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function InactiveCustomersPage({
  searchParams,
}: {
  searchParams: Promise<InactiveReportParams & { days?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const days = parseMinDays(params.days);
  const view = inactiveReportView(
    inactiveCustomersReport,
    await ReportService.getInactiveCustomers({ minDays: days }),
    days,
    params,
  );
  const { rows } = view;
  const neverOrdered = rows.filter((row) => row.lastOrderAt === null).length;

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={inactiveCustomersReport}
      sections={[
        { table: inactiveCustomersReport, rows, sortable: true, sort: view.sort },
      ]}
      query={view.query}
      filters={
        <>
          <DaysFilter days={days} />
          <BarangayFilter options={view.barangayOptions} selected={view.barangays} />
        </>
      }
      summary={`${rows.length - neverOrdered} with no order in ${days}+ days, ${neverOrdered} never ordered`}
    />
  );
}
