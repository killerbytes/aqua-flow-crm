import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import { inactiveCustomersReport } from "@/features/reports/definitions";
import {
  inactiveReportView,
  type InactiveReportParams,
} from "@/features/reports/inactive";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function InactiveCustomersPrintPage({
  searchParams,
}: {
  searchParams: Promise<InactiveReportParams & { days?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const days = parseMinDays(params.days);
  const view = inactiveReportView(
    inactiveCustomersReport,
    await ReportService.getInactiveCustomers({ minDays: days }),
    days,
    params,
  );
  const { rows } = view;

  return (
    <PrintableReport
      report={inactiveCustomersReport}
      sections={[{ table: inactiveCustomersReport, rows }]}
      backQuery={view.query}
      filters={[
        `No order in ${days}+ days, plus customers who have never ordered`,
        ...view.filterLines,
        `${rows.length} ${rows.length === 1 ? "customer" : "customers"}`,
      ]}
    />
  );
}
