import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import { inactiveWithEquipmentReport } from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function InactiveWithEquipmentPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays((await searchParams).days);
  const rows = await ReportService.getInactiveCustomersWithEquipment({
    minDays: days,
  });
  const units = rows.reduce((sum, row) => sum + row.totalHeld, 0);

  return (
    <PrintableReport
      report={inactiveWithEquipmentReport}
      rows={rows}
      backQuery={`days=${days}`}
      filters={[
        `No order in ${days}+ days, plus customers who have never ordered`,
        `${units} ${units === 1 ? "unit" : "units"} of regular equipment held`,
      ]}
    />
  );
}
