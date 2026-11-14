import { requirePagePermission } from "@/backend/auth/context";
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
  await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays((await searchParams).days);
  const rows = await ReportService.getInactiveCustomers({ minDays: days });
  const neverOrdered = rows.filter((row) => row.lastOrderAt === null).length;

  return (
    <ReportView
      report={inactiveCustomersReport}
      rows={rows}
      query={`days=${days}`}
      filters={<DaysFilter days={days} />}
      summary={`${rows.length - neverOrdered} with no order in ${days}+ days, ${neverOrdered} never ordered`}
    />
  );
}
