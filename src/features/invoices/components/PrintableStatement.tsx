"use client";

import { Invoice, InvoicePayment } from "@/backend/models";
import { ColorBadge } from "@/components/presentation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { InvoiceStatus, INVOICE_STATUS_BADGE_COLOR } from "@/lib/definitions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface PrintableStatementProps {
  invoice: Invoice;
  payments: InvoicePayment[];
}

export default function PrintableStatement({
  invoice,
  payments = [],
}: PrintableStatementProps) {
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const paidAmount = payments.reduce(
    (sum, p) => sum + Number(p.paymentAmount || 0),
    0,
  );
  const isVoid = invoice.status === InvoiceStatus.VOID;
  const remainingAmount = isVoid
    ? 0
    : Math.max(0, Number(invoice.amount) - paidAmount);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white text-slate-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href={`/invoices/${invoice.invoiceId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Invoice #{invoice.invoiceId}
        </Link>
        <Button
          onClick={() => {
            setOpen(false);
            window.print();
          }}
          className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Printer size={16} /> Print Statement
        </Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-lg print:shadow-none print:p-0 print:max-w-none border border-slate-200 print:border-none space-y-8">
        {isVoid && (
          <div className="rounded-lg border-2 border-red-600 p-4 text-center">
            <p className="text-2xl font-bold tracking-widest text-red-600">
              VOID
            </p>
            <p className="text-sm text-slate-700">
              This invoice was cancelled and is not payable.
            </p>
          </div>
        )}

        <div className="flex justify-between items-start border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              <Image
                src="/logo.jpg"
                alt={process.env.NEXT_PUBLIC_APP_NAME || ""}
                width={200}
                height={200}
              />
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Del Pilar St. Cabanatuan City
            </p>
            <p className="text-xs text-slate-500">
              0928-424-2411 • 0916-677-0046
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800 tracking-wider uppercase">
              Statement of Account
            </h2>
            <p className="text-sm font-mono font-semibold text-slate-700 mt-1">
              Invoice #{invoice.invoiceId}
            </p>
            <div className="mt-2 inline-block">
              <ColorBadge colorMap={INVOICE_STATUS_BADGE_COLOR}>
                {invoice.status}
              </ColorBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Billed To
            </h3>
            <p className="font-bold text-base text-slate-900">
              {invoice.customer?.name || "N/A"}
            </p>
            <p className="text-slate-600 mt-1">
              {invoice.customer?.address || "No address on file"}
            </p>
            <p className="text-slate-600">
              Contact: {invoice.customer?.phone || "N/A"}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-slate-50 space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Statement Dates
            </h3>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-mono font-medium">
                {formatDate(invoice.dateIssued)}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Due Date:</span>
              <span className="font-mono font-medium">
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Prepared By:</span>
              <span className="font-medium">
                {invoice.user?.name || "System"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Particulars / Delivered Items
          </h3>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-xs font-bold text-slate-600 uppercase">
                <th className="py-2">Order #</th>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.invoiceDetails?.length > 0 ? (
                invoice.invoiceDetails?.map((detail) => (
                  <tr key={detail.orderId} className="text-slate-800">
                    <td className="py-2.5 font-mono">#{detail.orderId}</td>
                    <td className="py-2.5 font-medium">
                      {formatDate(detail.order?.createdAt)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold">
                      {formatCurrency(detail.order?.totalAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-slate-500 italic"
                  >
                    No detailed line items listed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {payments.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Payment History Ledger
            </h3>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-xs font-bold text-slate-600 uppercase">
                  <th className="py-2">Payment Date</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((p, idx) => (
                  <tr key={p.id || idx} className="text-slate-700">
                    <td className="py-2 font-mono">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-2 font-medium">{p.paymentMethod}</td>
                    <td className="py-2 text-slate-500 text-xs">
                      {p.paymentNotes || "—"}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(p.paymentAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t-2 border-slate-800">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Invoice Subtotal:</span>
              <span className="font-mono font-semibold">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Total Payments Received:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t pt-2 border-slate-300">
              <span>Net Balance Due:</span>
              <span className="font-mono text-lg text-slate-900">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-200 grid grid-cols-2 gap-12 text-xs text-slate-500">
          <div className="space-y-8">
            <p className="italic">
              To pay via online transfer, please use the following details:{" "}
              <br />
              <strong>BDO: </strong>0918000000 <br />
              <strong>GCash: </strong>0918000000
            </p>
            <div>
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <p className="font-medium text-slate-700">
                Prepared / Authorized Signature
              </p>
            </div>
          </div>

          <div className="space-y-8 flex flex-col justify-between items-end">
            <div></div>
            <div className="w-48 text-left">
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <p className="font-medium text-slate-700">
                Received By / Customer Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
