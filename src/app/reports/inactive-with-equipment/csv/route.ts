import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import {
  inactiveWithEquipmentReport,
  reportCsv,
} from "@/features/reports/definitions";
import { inactiveReportView } from "@/features/reports/inactive";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const params = request.nextUrl.searchParams;
  const days = parseMinDays(params.get("days"));
  const { rows } = inactiveReportView(
    inactiveWithEquipmentReport,
    await ReportService.getInactiveCustomersWithEquipment({ minDays: days }),
    days,
    {
      sort: params.get("sort"),
      order: params.get("order"),
      barangay: params.getAll("barangay"),
    },
  );

  return csvResponse(
    `inactive-with-equipment-${days}d-${businessDateKey(new Date())}.csv`,
    reportCsv(inactiveWithEquipmentReport, rows),
  );
}
