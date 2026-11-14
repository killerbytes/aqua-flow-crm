import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import type { ReportMeta, ReportSection } from "./definitions";
import ReportTable from "./ReportTable";

export interface ReportDownload {
  label: string;
  href: string;
}

/**
 * The on-screen page of a report: title, filters, the print link, the CSV
 * links for those who may export, and its tables. `query` carries the current
 * filters to the printout and the CSV. Hiding the CSV links is only for tidiness:
 * the CSV routes check EXPORT_REPORTS themselves.
 */
export default function ReportView({
  report,
  sections,
  query = "",
  filters,
  summary,
  canExport = false,
  downloads,
}: {
  report: ReportMeta;
  sections: ReportSection[];
  query?: string;
  filters?: React.ReactNode;
  summary?: string;
  /** Whether to show the CSV links: checkPermission(role, "EXPORT_REPORTS"). */
  canExport?: boolean;
  /** Defaults to one CSV of the whole report. */
  downloads?: ReportDownload[];
}) {
  const suffix = query ? `?${query}` : "";
  const links = canExport
    ? (downloads ?? [
        { label: "CSV", href: `/reports/${report.slug}/csv${suffix}` },
      ])
    : [];
  const showHeadings = sections.length > 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-4">
        <PageHeader>{report.title}</PageHeader>
        <p className="text-sm text-muted-foreground">{report.description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">{filters}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/reports/${report.slug}/print${suffix}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer /> Print / PDF
          </Link>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download /> {link.label}
            </a>
          ))}
        </div>
      </div>

      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

      {sections.map((section, index) => (
        <section key={section.table.heading ?? index} className="space-y-2">
          {showHeadings && section.table.heading && (
            <h2 className="text-base font-semibold">{section.table.heading}</h2>
          )}
          <ReportTable {...section} />
        </section>
      ))}
    </div>
  );
}
