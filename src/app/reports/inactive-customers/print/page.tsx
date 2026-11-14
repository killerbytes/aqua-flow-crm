import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import { inactiveCustomersReport } from "@/features/reports/definitions";
import PrintableReport from "@/features/reports/PrintableReport";

export const dynamic = "force-dynamic";

export default async function InactiveCustomersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_REPORTS");

  const days = parseMinDays((await searchParams).days);
  const rows = await ReportService.getInactiveCustomers({ minDays: days });

  return (
    <PrintableReport
      report={inactiveCustomersReport}
      rows={rows}
      backQuery={`days=${days}`}
      filters={[
        `No order in ${days}+ days, plus customers who have never ordered`,
      ]}
    />
  );
}
