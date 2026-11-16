import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { EquipmentService } from "@/backend/services";
import {
  EQUIPMENT_LEDGER_CSV_TABLES,
  equipmentLedgerReport,
  equipmentLedgerSections,
} from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function EquipmentLedgerReportPage() {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const [balance, losses] = await Promise.all([
    EquipmentService.getBalanceSheetReport(),
    EquipmentService.getLossesReport(),
  ]);
  const sections = equipmentLedgerSections(balance, losses);
  const drifted = sections.balance.total!.drifted ?? 0;

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={equipmentLedgerReport}
      sections={[sections.balance, sections.losses]}
      summary={
        drifted > 0
          ? `${drifted} ${drifted === 1 ? "product's stock totals don't" : "products' stock totals don't"} match the ledger`
          : "Every product's stock totals match the ledger"
      }
      downloads={Object.entries(EQUIPMENT_LEDGER_CSV_TABLES).map(
        ([table, { table: def }]) => ({
          label: `${def.heading} CSV`,
          href: `/reports/equipment-ledger/csv?table=${table}`,
        }),
      )}
    />
  );
}
