import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { parseDateRange, RetailProductService } from "@/backend/services";
import {
  reportCsv,
  RETAIL_STOCK_CSV_TABLES,
  type RetailStockCsvTable,
} from "@/features/reports/definitions";
import { csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * One of the Retail Stock report's tables, picked by the `table` param: the
 * movement per product (the default), or every stock change in the range.
 */
export async function GET(request: NextRequest) {
  await initDatabase();
  await requirePagePermission("EXPORT_REPORTS");

  const search = request.nextUrl.searchParams;
  const range = parseDateRange({ from: search.get("from"), to: search.get("to") });
  const name = search.get("table");
  const key: RetailStockCsvTable =
    name && name in RETAIL_STOCK_CSV_TABLES
      ? (name as RetailStockCsvTable)
      : "movement";

  const report = await RetailProductService.getStockReport(range);
  // Each table is paired with its own rows here, so the two can't be mixed up.
  const tables = RETAIL_STOCK_CSV_TABLES;
  const csv: Record<RetailStockCsvTable, () => string> = {
    movement: () =>
      reportCsv(tables.movement.table, report.rows, report.total),
    log: () => reportCsv(tables.log.table, report.log),
  };

  return csvResponse(
    `${tables[key].name}-${range.from}-to-${range.to}.csv`,
    csv[key](),
  );
}
