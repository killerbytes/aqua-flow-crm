import { MonoText } from "@/components/presentation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RETAIL_STOCK_ENTRY_LABELS } from "@/lib/definitions";
import { formatDateTime } from "@/lib/utils";
import type { RetailStockEntry } from "@/types/models";

/** Stock movements, newest first: restocks, sales, voids, and write-offs. */
export default function RetailStockLog({
  entries,
}: {
  entries: RetailStockEntry[];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-muted-foreground"
              >
                No stock movements yet.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.entryId}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell>{entry.product?.name ?? "Unknown product"}</TableCell>
                <TableCell>
                  {RETAIL_STOCK_ENTRY_LABELS[entry.type] ?? entry.type}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${
                    entry.quantityChange > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {entry.quantityChange > 0
                    ? `+${entry.quantityChange}`
                    : entry.quantityChange}
                </TableCell>
                <TableCell>
                  {entry.saleId ? <MonoText>Sale #{entry.saleId}</MonoText> : "—"}
                </TableCell>
                <TableCell>{entry.user?.name ?? "Not recorded"}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {entry.notes || "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
