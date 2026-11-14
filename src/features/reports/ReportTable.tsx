import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cx } from "class-variance-authority";
import Link from "next/link";
import type { ReportDefinition } from "./definitions";

/**
 * A report's rows, all of them, on screen. Reports aren't paged, so what's on
 * screen is what prints and what downloads.
 */
export default function ReportTable<Row>({
  report,
  rows,
}: {
  report: ReportDefinition<Row>;
  rows: Row[];
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {report.columns.map((column) => (
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
                colSpan={report.columns.length}
                className="py-10 text-center text-muted-foreground"
              >
                {report.emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index}>
                {report.columns.map((column) => {
                  const value = column.value(row);
                  const href = column.href?.(row);
                  return (
                    <TableCell
                      key={column.header}
                      className={cx(
                        "whitespace-normal",
                        column.align === "right" && "text-right font-mono",
                      )}
                    >
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
      </Table>
    </div>
  );
}
