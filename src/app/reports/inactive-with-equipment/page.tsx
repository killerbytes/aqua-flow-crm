import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { parseMinDays, ReportService } from "@/backend/services";
import BarangayFilter from "@/features/reports/BarangayFilter";
import DaysFilter from "@/features/reports/DaysFilter";
import { inactiveWithEquipmentReport } from "@/features/reports/definitions";
import { inactiveEquipmentFilter } from "@/features/reports/equipment";
import {
  inactiveReportView,
  type InactiveReportParams,
} from "@/features/reports/inactive";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function InactiveWithEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<InactiveReportParams & { days?: string }>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const params = await searchParams;
  const days = parseMinDays(params.days);
  const equipment = inactiveEquipmentFilter(
    await ReportService.getInactiveCustomersWithEquipment({ minDays: days }),
    params.product,
  );
  const view = inactiveReportView(
    inactiveWithEquipmentReport,
    equipment.rows,
    days,
    params,
  );
  const { rows } = view;
  const units = rows.reduce((sum, row) => sum + row.totalHeld, 0);

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={inactiveWithEquipmentReport}
      sections={[
        {
          table: inactiveWithEquipmentReport,
          rows,
          sortable: true,
          sort: view.sort,
        },
      ]}
      query={view.query}
      filters={
        <>
          <DaysFilter days={days} />
          <BarangayFilter
            param="product"
            label="Equipment"
            placeholder="All equipment"
            emptyText="No equipment found."
            options={equipment.productOptions}
            selected={equipment.products}
          />
          <BarangayFilter options={view.barangayOptions} selected={view.barangays} />
        </>
      }
      summary={`${rows.length} ${rows.length === 1 ? "customer" : "customers"} holding ${units} ${units === 1 ? "unit" : "units"}`}
    />
  );
}
