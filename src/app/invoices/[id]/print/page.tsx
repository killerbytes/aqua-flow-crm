import { requirePageUser } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { Invoice } from "@/backend/models";
import { InvoiceService } from "@/backend/services";
import PrintableStatement from "@/features/invoices/components/PrintableStatement";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await initDatabase();
  await requirePageUser();
  const { id } = await params;
  let invoice: Invoice | null = null;

  try {
    invoice = await InvoiceService.get(id);
  } catch (err) {
    invoice = null;
  }

  if (!invoice || !invoice.invoiceId) {
    redirect("/invoices");
  }

  const payments = await InvoiceService.getPayments(Number(id));

  return <PrintableStatement invoice={invoice} payments={payments} />;
}
