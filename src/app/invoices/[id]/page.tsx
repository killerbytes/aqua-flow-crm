import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { Invoice } from "@/backend/models";
import { InvoiceService } from "@/backend/services";
import { ColorBadge } from "@/components/presentation";
import PageHeader from "@/components/shared/PageHeader";
import TabWrapper from "@/components/TabWrapper";
import { Button } from "@/components/ui/button";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceDetailList from "@/features/invoices/components/InvoiceDetailList";
import { PaymentFormModal } from "@/features/invoices/components/PaymentFormModal";
import { PaymentFormModalButton } from "@/features/invoices/components/PaymentFormModalButton";
import PaymentList from "@/features/invoices/components/PaymentList";
import { VoidInvoiceButton } from "@/features/invoices/components/VoidInvoiceButton";
import { INVOICE_STATUS_BADGE_COLOR, InvoiceStatus } from "@/lib/definitions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await initDatabase();
  await requirePagePermission("VIEW_INVOICES");
  const { id } = await params;
  let invoice: Invoice | null = null;

  try {
    invoice = await InvoiceService.get(id);
  } catch (err) {
    invoice = null;
  }
  if (!invoice || !invoice.invoiceId) redirect("/invoices");
  const payments = await InvoiceService.getPayments(Number(id));
  const activePayments = payments.filter((p) => !p.reversedAt);
  const paidAmount = activePayments.reduce(
    (sum, p) => sum + Number(p.paymentAmount || 0),
    0,
  );
  const remainingAmount = Math.max(0, Number(invoice.amount) - paidAmount);
  const isVoid = invoice.status === InvoiceStatus.VOID;
  const canVoid = !isVoid && activePayments.length === 0;

  return (
    <>
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Back to Invoices
      </Link>

      <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="md:flex justify-between items-center space-y-4">
          <div>
            <PageHeader>Invoice for {invoice.customer?.name || "[Deleted]"}</PageHeader>
          </div>
          <div className="flex items-center gap-2">
            {canVoid && <VoidInvoiceButton invoiceId={invoice.invoiceId} />}
            <Link href={`/invoices/${invoice.invoiceId}/print`} target="_blank">
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
              >
                <Printer size={16} /> Print Statement
              </Button>
            </Link>
          </div>
        </div>
        {isVoid && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm space-y-1">
            <p className="font-semibold text-destructive">
              This invoice was voided and is not payable.
            </p>
            <p>
              <strong>Voided by:</strong> {invoice.voidedByUser?.name || "N/A"}{" "}
              on {invoice.voidedAt ? formatDate(invoice.voidedAt) : "N/A"}
            </p>
            <p>
              <strong>Reason:</strong> {invoice.voidReason}
            </p>
          </div>
        )}
        {invoice && (
          <div className="flex col-span-2 justify-between pt-4 border-t">
            <div className="space-y-2 text-sm">
              <p>
                <strong>Logged by:</strong> {invoice.user?.name || ""}
              </p>
              <p>
                <strong>Date Issued:</strong> {formatDate(invoice.dateIssued)}
              </p>
              <p>
                <strong>Due date:</strong> {formatDate(invoice.dueDate)}
              </p>
              <p>
                <strong>Payment date:</strong>
                {invoice.paymentDate ? formatDate(invoice.paymentDate) : "N/A"}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex justify-end items-center gap-2">
                <strong>Total Amount:</strong>
              </div>
              <span className="flex justify-end items-center gap-2">
                <ColorBadge colorMap={INVOICE_STATUS_BADGE_COLOR}>
                  {invoice.status}
                </ColorBadge>
                <span className="font-mono font-semibold text-xl text-primary">
                  {formatCurrency(invoice.amount)}
                </span>
              </span>

              {paidAmount > 0 && (
                <div className="text-sm pt-2 space-y-1 text-muted-foreground border-t mt-2">
                  <p>
                    <strong>Paid Amount:</strong>{" "}
                    <span className="font-mono font-medium text-emerald-600">
                      {formatCurrency(paidAmount)}
                    </span>
                  </p>
                  {remainingAmount > 0 && (
                    <p>
                      <strong>Remaining Balance:</strong>{" "}
                      <span className="font-mono font-medium text-amber-600">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <TabWrapper defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Invoice Details</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
            <InvoiceDetailList invoiceDetails={invoice.invoiceDetails || []} />
            <div className="flex justify-end w-full">
              {invoice.status !== InvoiceStatus.PAID && !isVoid ? (
                <PaymentFormModalButton invoice={invoice} variant="secondary">
                  Pay Invoice
                </PaymentFormModalButton>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="payments">
            <PaymentList payments={payments} canReverse={!isVoid} />
          </TabsContent>
        </TabWrapper>
      </div>

      <PaymentFormModal />
    </>
  );
}
