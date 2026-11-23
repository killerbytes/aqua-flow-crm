import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import { inactiveWithEquipmentReport } from "@/features/reports/definitions";
import {
  inactiveReportView,
  type InactiveReportParams,
} from "@/features/reports/inactive";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function InactiveWithEquipmentPrintPage({
  searchParams,
}: {
  searchParams: Promise<InactiveReportParams & { days?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const days = parseMinDays(params.days);
  const view = inactiveReportView(
    inactiveWithEquipmentReport,
    await ReportService.getInactiveCustomersWithEquipment({ minDays: days }),
    days,
    params,
  );
  const { rows } = view;
  const units = rows.reduce((sum, row) => sum + row.totalHeld, 0);

  return (
    <PrintableReport
      report={inactiveWithEquipmentReport}
      sections={[{ table: inactiveWithEquipmentReport, rows }]}
      backQuery={view.query}
      filters={[
        `No order in ${days}+ days, plus customers who have never ordered`,
        ...view.filterLines,
        `${units} ${units === 1 ? "unit" : "units"} of regular equipment held`,
      ]}
    />
  );
}
