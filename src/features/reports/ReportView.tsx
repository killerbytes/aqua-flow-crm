import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import type { ReportDefinition } from "./definitions";
import ReportTable from "./ReportTable";

/**
 * The on-screen page of a report: title, filters, the print and CSV links, and
 * the table. `query` carries the current filters to the printout and the CSV.
 */
export default function ReportView<Row>({
  report,
  rows,
  query = "",
  filters,
  summary,
}: {
  report: ReportDefinition<Row>;
  rows: Row[];
  query?: string;
  filters?: React.ReactNode;
  summary?: string;
}) {
  const suffix = query ? `?${query}` : "";

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-4">
        <PageHeader>{report.title}</PageHeader>
        <p className="text-sm text-muted-foreground">{report.description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">{filters}</div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/${report.slug}/print${suffix}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer /> Print / PDF
          </Link>
          <a
            href={`/reports/${report.slug}/csv${suffix}`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download /> CSV
          </a>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {summary ?? `${rows.length} ${rows.length === 1 ? "row" : "rows"}`}
      </p>

      <ReportTable report={report} rows={rows} />
    </div>
  );
}
