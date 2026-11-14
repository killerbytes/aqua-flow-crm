import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cx } from "class-variance-authority";
import Link from "next/link";
import type { ReportSection } from "./definitions";

/**
 * A report table, every row of it, on screen. Reports aren't paged, so what's
 * on screen is what prints and what downloads.
 */
export default function ReportTable<Row>({
  table,
  rows,
  total,
}: ReportSection<Row>) {
  const cellClass = (align?: "left" | "right") =>
    cx("whitespace-normal", align === "right" && "text-right font-mono");

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {table.columns.map((column) => (
              <TableHead
                key={column.header}
                className={cx(column.align === "right" && "text-right")}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.columns.length}
                className="py-10 text-center text-muted-foreground"
              >
                {table.emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index}>
                {table.columns.map((column) => {
                  const value = column.value(row);
                  const href = column.href?.(row);
                  return (
                    <TableCell key={column.header} className={cellClass(column.align)}>
                      {href ? (
                        <Link href={href} className="font-medium hover:underline">
                          {value}
                        </Link>
                      ) : (
                        (value ?? "—")
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
        {total && rows.length > 0 && (
          <TableFooter>
            <TableRow className="font-semibold">
              {table.columns.map((column) => (
                <TableCell key={column.header} className={cellClass(column.align)}>
                  {column.value(total) ?? ""}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
