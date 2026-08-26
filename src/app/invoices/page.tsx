import { Invoice } from "@/backend/models";
import { InvoiceQueryParams, InvoiceService } from "@/backend/services";
import PageHeader from "@/components/shared/PageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InvoiceList from "@/features/invoices/components/InvoiceList";
import { PAGINATION } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { Paginated } from "@/types";
import { Receipt } from "lucide-react";

interface InvoicePageProps {
  searchParams?: Promise<InvoiceQueryParams>;
}

export default async function InvoicesPage({ searchParams }: InvoicePageProps) {
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;
  const sort = params?.sort;
  const order = params?.order;

  let invoices: Paginated<Invoice> = {
    rows: [],
    pagination: { total: 0, currentPage: 1, totalPages: 1 },
  };
  try {
    const res = await InvoiceService.getAll({
      limit,
      page,
      sort,
      order,
    });
    if (res) {
      invoices = res;
    }
  } catch (err) {
    invoices = {
      rows: [],
      pagination: { total: 0, currentPage: 1, totalPages: 1 },
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <PageHeader>
            <Receipt />
            Invoices
          </PageHeader>
          <p className="text-muted-foreground">
            View invoices, owed container balances, and temporary loan status.
          </p>
        </div>
      </div>

      {!invoices?.rows || invoices.rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium">No Invoice records found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>
                  {invoices.summary.totalUnpaid?.label}
                </CardDescription>
                <CardTitle>
                  {formatCurrency(
                    Number(invoices.summary.totalUnpaid?.value || 0),
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            {invoices.summary.unpaidOrders?.value > 0 && (
              <Card>
                <CardHeader>
                  <CardDescription>
                    {invoices.summary.unpaidOrders?.label}
                  </CardDescription>
                  <CardTitle>{invoices.summary.unpaidOrders?.value}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {invoices.summary.partialOrders?.value > 0 && (
              <Card>
                <CardHeader>
                  <CardDescription>
                    {invoices.summary.partialOrders?.label}
                  </CardDescription>
                  <CardTitle>{invoices.summary.partialOrders?.value}</CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
          <InvoiceList invoices={invoices} />
        </>
      )}
    </div>
  );
}
