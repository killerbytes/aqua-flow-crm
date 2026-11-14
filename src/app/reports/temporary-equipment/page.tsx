import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import { temporaryEquipmentReport } from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function TemporaryEquipmentPage() {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const rows = await ReportService.getTemporaryEquipment();
  const units = rows.reduce((sum, row) => sum + row.quantity, 0);
  const customers = new Set(rows.map((row) => row.customerId)).size;

  return (
    <ReportView
      report={temporaryEquipmentReport}
      rows={rows}
      summary={`${units} ${units === 1 ? "unit" : "units"} with ${customers} ${customers === 1 ? "customer" : "customers"}`}
    />
  );
}
