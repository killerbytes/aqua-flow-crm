import Image from "next/image";
import {
  formatGeneratedAt,
  type ReportMeta,
  type ReportSection,
} from "./definitions";
import PrintToolbar from "./PrintToolbar";

function PrintTable({ table, rows, total }: ReportSection) {
  const align = (a?: "left" | "right") =>
    a === "right" ? "text-right tabular-nums" : "";

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-slate-300 text-left">
          {table.columns.map((column) => (
            <th
              key={column.header}
              className={`px-2 py-2 font-semibold ${column.align === "right" ? "text-right" : ""}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={table.columns.length}
              className="px-2 py-8 text-center text-slate-500"
            >
              {table.emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={index} className="break-inside-avoid border-b border-slate-200">
              {table.columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-2 py-1.5 align-top ${align(column.align)}`}
                >
                  {column.value(row) ?? "—"}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
      {total && rows.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-semibold">
            {table.columns.map((column) => (
              <td key={column.header} className={`px-2 py-2 ${align(column.align)}`}>
                {column.value(total) ?? ""}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

/**
 * A report laid out for paper, in fixed light colors whatever the app's theme.
 * The browser's print dialog saves it as a PDF.
 */
export default function PrintableReport({
  report,
  sections,
  filters = [],
  backQuery = "",
  generatedAt = new Date(),
}: {
  report: ReportMeta;
  sections: ReportSection[];
  /** Lines describing the filters in effect, such as "No order in 30+ days". */
  filters?: string[];
  backQuery?: string;
  generatedAt?: Date;
}) {
  const showHeadings = sections.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8 print:bg-white print:p-0">
      <PrintToolbar
        backHref={`/reports/${report.slug}${backQuery ? `?${backQuery}` : ""}`}
        backLabel={`Back to ${report.title}`}
      />

      <div className="mx-auto max-w-5xl space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-lg print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
            <p className="max-w-xl text-sm text-slate-600">
              {report.description}
            </p>
            {filters.map((line) => (
              <p key={line} className="text-sm font-medium text-slate-800">
                {line}
              </p>
            ))}
            <p className="text-xs text-slate-500">
              Generated {formatGeneratedAt(generatedAt)}
            </p>
          </div>
          <Image
            src="/logo.jpg"
            alt={process.env.NEXT_PUBLIC_APP_NAME || ""}
            width={140}
            height={86}
          />
        </header>

        {sections.map((section, index) => (
          <section
            key={section.table.heading ?? index}
            className="space-y-2 break-inside-avoid-page"
          >
            {showHeadings && section.table.heading && (
              <h2 className="text-base font-semibold">{section.table.heading}</h2>
            )}
            <PrintTable {...section} />
          </section>
        ))}
      </div>
    </div>
  );
}
