import { CommonService } from "@/backend/services/commonService";
import type { InactiveCustomerRow } from "@/backend/services/report.service";
import {
  barangayOptions,
  describeSort,
  filterByBarangays,
  parseBarangays,
  parseReportSort,
  sortReportRows,
  type ReportTableDefinition,
} from "./definitions";

/** The search params the inactive customer reports take besides `days`. */
export interface InactiveReportParams {
  sort?: unknown;
  order?: unknown;
  barangay?: unknown;
}

/**
 * The rows an inactive customer report shows for its search params, filtered
 * by barangay and sorted, and what its screen, printout, and CSV need to carry
 * those choices along. The same for all three, so they always match.
 */
export function inactiveReportView<Row extends InactiveCustomerRow>(
  table: ReportTableDefinition<Row>,
  allRows: Row[],
  days: number,
  params: InactiveReportParams,
) {
  const sort = parseReportSort(table, params.sort, params.order);
  const barangays = parseBarangays(params.barangay);
  const rows = sortReportRows(table, filterByBarangays(allRows, barangays), sort);

  // The barangays in the report, and any picked that no longer has a row in
  // it, so its chip still shows and can be removed.
  const options = barangayOptions(allRows);
  for (const code of barangays) {
    if (options.some((option) => option.code === code)) continue;
    options.push({
      code,
      name: CommonService.getBarangayNameByCode(code) ?? code,
      count: 0,
    });
  }
  options.sort((a, b) => a.name.localeCompare(b.name));

  const query = new URLSearchParams({ days: String(days) });
  if (sort) {
    query.set("sort", sort.key);
    query.set("order", sort.order);
  }
  for (const code of barangays) query.append("barangay", code);

  const names = barangays.map(
    (code) => options.find((option) => option.code === code)?.name ?? code,
  );
  const sortLine = describeSort(table, sort);

  return {
    rows,
    sort,
    barangays,
    barangayOptions: options,
    query: query.toString(),
    /** Lines for the printout's heading. */
    filterLines: [
      ...(names.length > 0
        ? [`${names.length === 1 ? "Barangay" : "Barangays"}: ${names.join(", ")}`]
        : []),
      ...(sortLine ? [sortLine] : []),
    ],
  };
}
