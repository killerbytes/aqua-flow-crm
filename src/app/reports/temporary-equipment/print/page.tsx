import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import { temporaryEquipmentReport } from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function TemporaryEquipmentPrintPage() {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const rows = await ReportService.getTemporaryEquipment();
  const units = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <PrintableReport
      report={temporaryEquipmentReport}
      rows={rows}
      filters={[`${units} ${units === 1 ? "unit" : "units"} out on loan`]}
    />
  );
}
