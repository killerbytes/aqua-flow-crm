import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import {
  customersWithEquipmentReport,
  reportCsv,
} from "@/features/reports/definitions";
import { customerEquipmentView } from "@/features/reports/equipment";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const params = request.nextUrl.searchParams;
  const { rows } = customerEquipmentView(
    await ReportService.getCustomersWithEquipment(),
    {
      sort: params.get("sort"),
      order: params.get("order"),
      barangay: params.getAll("barangay"),
      product: params.getAll("product"),
    },
  );

  return csvResponse(
    `customers-with-equipment-${businessDateKey(new Date())}.csv`,
    reportCsv(customersWithEquipmentReport, rows),
  );
}
