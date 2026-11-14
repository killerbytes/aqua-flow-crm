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
  const data = {
    period: [report.periods, report.periodTotal],
    products: [report.products, report.productTotal],
    collections: [report.collections, report.collectionTotal],
  } as const;
  const [rows, total] = data[key];
  const { table, name: file } = SALES_CSV_TABLES[key];

  return csvResponse(
    `${file}-${range.from}-to-${range.to}.csv`,
    reportCsv(table as any, rows as any[], total),
  );
}
