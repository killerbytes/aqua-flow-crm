import type {
  CustomerEquipmentRow,
  InactiveCustomerWithEquipmentRow,
} from "@/backend/services/report.service";
import {
  customersWithEquipmentReport,
  describeSort,
  filterByBarangays,
  parseBarangays,
  parseReportSort,
  sortReportRows,
  type BarangayOption,
} from "./definitions";
import { barangayFilterOptions } from "./inactive";

/** The search params the Customers with Equipment report takes. */
export interface CustomerEquipmentParams {
  sort?: unknown;
  order?: unknown;
  barangay?: unknown;
  product?: unknown;
}

/**
 * The rows the Customers with Equipment report shows for its search params,
 * filtered by product and barangay and sorted, and what its screen, printout,
 * and CSV need to carry those choices along.
 */
export function customerEquipmentView(
  allRows: CustomerEquipmentRow[],
  params: CustomerEquipmentParams,
) {
  const table = customersWithEquipmentReport;
  const sort = parseReportSort(table, params.sort, params.order);
  const barangays = parseBarangays(params.barangay);
  // Same shape as the barangay param: repeated once per product picked.
  const products = parseBarangays(params.product);

  const byProduct =
    products.length === 0
      ? allRows
      : allRows.filter((row) => products.includes(String(row.productId)));
  const rows = sortReportRows(table, filterByBarangays(byProduct, barangays), sort);

  const productOptions = productFilterOptions(allRows, products);
  const barangayOptions = barangayFilterOptions(byProduct, barangays);

  const query = new URLSearchParams();
  if (sort) {
    query.set("sort", sort.key);
    query.set("order", sort.order);
  }
  for (const code of products) query.append("product", code);
  for (const code of barangays) query.append("barangay", code);

  const names = (picked: string[], options: BarangayOption[]) =>
    picked.map((code) => options.find((option) => option.code === code)?.name ?? code);
  const productNames = names(products, productOptions);

  const barangayNames = names(barangays, barangayOptions);
  const sortLine = describeSort(table, sort);

  return {
    rows,
    sort,
    products,
    productOptions,
    barangays,
    barangayOptions,
    query: query.toString(),
    /** Lines for the printout's heading. */
    filterLines: [
      ...(productNames.length > 0
        ? [`${productNames.length === 1 ? "Product" : "Products"}: ${productNames.join(", ")}`]
        : []),
      ...(barangayNames.length > 0
        ? [`${barangayNames.length === 1 ? "Barangay" : "Barangays"}: ${barangayNames.join(", ")}`]
        : []),
      ...(sortLine ? [sortLine] : []),
    ],
  };
}

/**
 * The products in the report, with how many rows hold each, and any picked
 * that no longer has a row in it, so its chip still shows and can be removed.
 */
export function productFilterOptions(
  items: { productId: number; productName: string }[],
  picked: string[],
): BarangayOption[] {
  const options = new Map<string, BarangayOption>();
  for (const item of items) {
    const code = String(item.productId);
    const option = options.get(code) ?? { code, name: item.productName, count: 0 };
    option.count += 1;
    options.set(code, option);
  }
  for (const code of picked) {
    if (!options.has(code)) {
      options.set(code, { code, name: `Product #${code}`, count: 0 });
    }
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The Inactive with Equipment rows narrowed to the products in the `product`
 * search param: each row keeps only those products, its total follows, and
 * customers holding none of them drop out. Every row when none is picked.
 */
export function inactiveEquipmentFilter(
  allRows: InactiveCustomerWithEquipmentRow[],
  value: unknown,
) {
  const products = parseBarangays(value);
  const productOptions = productFilterOptions(
    allRows.flatMap((row) => row.equipment),
    products,
  );
  const rows =
    products.length === 0
      ? allRows
      : allRows.flatMap((row) => {
          const equipment = row.equipment.filter((item) =>
            products.includes(String(item.productId)),
          );
          if (equipment.length === 0) return [];
          return [
            {
              ...row,
              equipment,
              totalHeld: equipment.reduce((sum, item) => sum + item.quantity, 0),
            },
          ];
        });
  const names = products.map(
    (code) => productOptions.find((option) => option.code === code)?.name ?? code,
  );

  return {
    rows,
    products,
    productOptions,
    /** For the printout's heading, when any product is picked. */
    filterLines:
      names.length > 0
        ? [`${names.length === 1 ? "Product" : "Products"}: ${names.join(", ")}`]
        : [],
  };
}

/** "12 customers holding 30 units". */
export function customerEquipmentSummary(rows: CustomerEquipmentRow[]) {
  const customers = new Set(rows.map((row) => row.customerId)).size;
  const units = rows.reduce((sum, row) => sum + row.quantity, 0);
  return `${customers} ${customers === 1 ? "customer" : "customers"} holding ${units} ${units === 1 ? "unit" : "units"}`;
}
