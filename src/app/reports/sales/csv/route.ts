import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import {
  FinanceReportService,
  parseDateRange,
  parseSalesGroup,
} from "@/backend/services";
import {
  reportCsv,
  SALES_CSV_TABLES,
  type SalesCsvTable,
} from "@/features/reports/definitions";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** One of the Sales report's tables, picked by the `table` param. */
export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const search = request.nextUrl.searchParams;
  const range = parseDateRange({ from: search.get("from"), to: search.get("to") });
  const group = parseSalesGroup(search.get("group"));
  const name = search.get("table");
  const key: SalesCsvTable =
    name && name in SALES_CSV_TABLES ? (name as SalesCsvTable) : "period";

  const report = await FinanceReportService.getSales(range, group);
  // Each table is paired with its own rows here, so the two can't be mixed up.
  const tables = SALES_CSV_TABLES;
  const csv: Record<SalesCsvTable, () => string> = {
    period: () =>
      reportCsv(tables.period.table, report.periods, report.periodTotal),
    products: () =>
      reportCsv(tables.products.table, report.products, report.productTotal),
    collections: () =>
      reportCsv(
        tables.collections.table,
        report.collections,
        report.collectionTotal,
      ),
  };

  return csvResponse(
    `${tables[key].name}-${range.from}-to-${range.to}.csv`,
    csv[key](),
  );
}
