import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { EquipmentService } from "@/backend/services";
import {
  EQUIPMENT_LEDGER_CSV_TABLES,
  equipmentLedgerSections,
  reportCsv,
  type EquipmentLedgerCsvTable,
} from "@/features/reports/definitions";
import { businessDateKey } from "@/lib/business-time";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** One of the Equipment Ledger report's tables, picked by the `table` param. */
export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const name = request.nextUrl.searchParams.get("table");
  const key: EquipmentLedgerCsvTable =
    name && name in EQUIPMENT_LEDGER_CSV_TABLES
      ? (name as EquipmentLedgerCsvTable)
      : "balance";

  const [balance, losses] = await Promise.all([
    EquipmentService.getBalanceSheetReport(),
    EquipmentService.getLossesReport(),
  ]);
  const sections = equipmentLedgerSections(balance, losses);
  // Each table is paired with its own rows here, so the two can't be mixed up.
  const csv: Record<EquipmentLedgerCsvTable, () => string> = {
    balance: () => {
      const { table, rows, total } = sections.balance;
      return reportCsv(table, rows, total);
    },
    losses: () => {
      const { table, rows, total } = sections.losses;
      return reportCsv(table, rows, total);
    },
  };

  return csvResponse(
    `${EQUIPMENT_LEDGER_CSV_TABLES[key].name}-${businessDateKey(new Date())}.csv`,
    csv[key](),
  );
}
