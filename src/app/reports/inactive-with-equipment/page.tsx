import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import DaysFilter from "@/features/reports/DaysFilter";
import { inactiveWithEquipmentReport } from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function InactiveWithEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays((await searchParams).days);
  const rows = await ReportService.getInactiveCustomersWithEquipment({
    minDays: days,
  });
  const units = rows.reduce((sum, row) => sum + row.totalHeld, 0);

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={inactiveWithEquipmentReport}
      sections={[{ table: inactiveWithEquipmentReport, rows }]}
      query={`days=${days}`}
      filters={<DaysFilter days={days} />}
      summary={`${rows.length} ${rows.length === 1 ? "customer" : "customers"} holding ${units} ${units === 1 ? "unit" : "units"}`}
    />
  );
}
