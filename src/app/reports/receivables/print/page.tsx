import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService } from "@/backend/services";
import { formatPeso, receivablesReport } from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function ReceivablesReportPrintPage() {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const { rows, total } = await FinanceReportService.getReceivablesAging();

  return (
    <PrintableReport
      report={receivablesReport}
      sections={[{ table: receivablesReport, rows, total }]}
      filters={[
        `${rows.length} ${rows.length === 1 ? "customer" : "customers"}, ${formatPeso(total.total)} owed in all`,
      ]}
    />
  );
}
