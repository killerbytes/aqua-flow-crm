import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { FinanceReportService } from "@/backend/services";
import { formatPeso, receivablesReport } from "@/features/reports/definitions";
import ReportView from "@/features/reports/ReportView";
import { fromCents, toCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ReceivablesReportPage() {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const { rows, total } = await FinanceReportService.getReceivablesAging();
  const pastDue = fromCents(toCents(total.total) - toCents(total.current));

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={receivablesReport}
      sections={[{ table: receivablesReport, rows, total }]}
      summary={`${rows.length} ${rows.length === 1 ? "customer owes" : "customers owe"} ${formatPeso(total.total)}, ${formatPeso(pastDue)} of it past due`}
    />
  );
}
