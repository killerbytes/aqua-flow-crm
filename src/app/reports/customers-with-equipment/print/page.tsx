import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import { customersWithEquipmentReport } from "@/features/reports/definitions";
import {
  customerEquipmentSummary,
  customerEquipmentView,
  type CustomerEquipmentParams,
} from "@/features/reports/equipment";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function CustomersWithEquipmentPrintPage({
  searchParams,
}: {
  searchParams: Promise<CustomerEquipmentParams>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const view = customerEquipmentView(
    await ReportService.getCustomersWithEquipment(),
    await searchParams,
  );

  return (
    <PrintableReport
      report={customersWithEquipmentReport}
      sections={[{ table: customersWithEquipmentReport, rows: view.rows }]}
      backQuery={view.query}
      filters={[...view.filterLines, customerEquipmentSummary(view.rows)]}
    />
  );
}
