import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import DaysFilter from "@/features/reports/DaysFilter";
import { inactiveCustomersReport } from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function InactiveCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays((await searchParams).days);
  const rows = await ReportService.getInactiveCustomers({ minDays: days });
  const neverOrdered = rows.filter((row) => row.lastOrderAt === null).length;

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={inactiveCustomersReport}
      sections={[{ table: inactiveCustomersReport, rows }]}
      query={`days=${days}`}
      filters={<DaysFilter days={days} />}
      summary={`${rows.length - neverOrdered} with no order in ${days}+ days, ${neverOrdered} never ordered`}
    />
  );
}
