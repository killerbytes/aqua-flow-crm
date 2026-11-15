import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { EquipmentService } from "@/backend/services";
import {
  equipmentLedgerReport,
  equipmentLedgerSections,
} from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function EquipmentLedgerPrintPage() {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const [balance, losses] = await Promise.all([
    EquipmentService.getBalanceSheetReport(),
    EquipmentService.getLossesReport(),
  ]);
  const sections = equipmentLedgerSections(balance, losses);
  const drifted = sections.balance.total!.drifted ?? 0;

  return (
    <PrintableReport
      report={equipmentLedgerReport}
      sections={[sections.balance, sections.losses]}
      filters={[
        drifted > 0
          ? `${drifted} ${drifted === 1 ? "product doesn't" : "products don't"} match the ledger`
          : "All products match the ledger",
      ]}
    />
  );
}
