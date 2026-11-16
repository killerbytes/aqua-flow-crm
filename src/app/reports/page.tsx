import { requirePagePermission } from "@/backend/auth/context";
import PageHeader from "@/components/shared/PageHeader";
import { REPORTS } from "@/features/reports/definitions";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage() {
  await requirePagePermission("VIEW_REPORTS");

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <PageHeader>Reports</PageHeader>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <Link
            key={report.slug}
            href={report.href}
            className="group flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary"
          >
            <span className="flex items-center justify-between font-semibold">
              {report.title}
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-sm text-muted-foreground">
              {report.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
