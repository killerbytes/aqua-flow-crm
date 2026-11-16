"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import React from "react";

/** Back link and print button above a printout; neither prints. */
export default function PrintToolbar({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const { setOpen } = useSidebar();

  // The sidebar would otherwise take up width on the printed page.
  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={16} /> {backLabel}
      </Link>
      <Button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
      >
        <Printer size={16} /> Print / Save as PDF
      </Button>
    </div>
  );
}
