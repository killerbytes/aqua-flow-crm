import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import {
  reportCsv,
  temporaryEquipmentReport,
} from "@/features/reports/definitions";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const rows = await ReportService.getTemporaryEquipment();

  return csvResponse(
    `temporary-equipment-${businessDateKey(new Date())}.csv`,
    reportCsv(temporaryEquipmentReport, rows),
  );
}
