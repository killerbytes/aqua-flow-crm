import { requirePagePermission } from "@/backend/auth/context";
import { checkPermission } from "@/backend/rbac/permissions";
import { initDatabase } from "@/backend/db/database";
import { ReportService } from "@/backend/services";
import BarangayFilter from "@/features/reports/BarangayFilter";
import { customersWithEquipmentReport } from "@/features/reports/definitions";
import {
  customerEquipmentSummary,
  customerEquipmentView,
  type CustomerEquipmentParams,
} from "@/features/reports/equipment";
import ReportView from "@/features/reports/ReportView";

export const dynamic = "force-dynamic";

export default async function CustomersWithEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<CustomerEquipmentParams>;
}) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_REPORTS");

  const view = customerEquipmentView(
    await ReportService.getCustomersWithEquipment(),
    await searchParams,
  );

  return (
    <ReportView
      canExport={checkPermission(user.role, "EXPORT_REPORTS")}
      report={customersWithEquipmentReport}
      sections={[
        {
          table: customersWithEquipmentReport,
          rows: view.rows,
          sortable: true,
          sort: view.sort,
        },
      ]}
      query={view.query}
      filters={
        <>
          <BarangayFilter
            param="product"
            label="Equipment"
            placeholder="All equipment"
            emptyText="No equipment found."
            options={view.productOptions}
            selected={view.products}
          />
          <BarangayFilter options={view.barangayOptions} selected={view.barangays} />
        </>
      }
      summary={customerEquipmentSummary(view.rows)}
    />
  );
}
