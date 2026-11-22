import type { RetailSalePage } from "@/backend/services/retail.service";
import Pager from "@/components/Pager";
import { MonoText } from "@/components/presentation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_METHOD_LABELS, PaymentMethod } from "@/lib/definitions";
import { formatPeso } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { VoidRetailSaleButton } from "./VoidRetailSaleButton";

const methodLabel = (method: string) =>
  PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;

/**
 * Retail sales, newest first. Voided ones stay in the list, marked, with who
 * voided them and why.
 */
export default function RetailSaleList({
  sales,
  canVoid = false,
  hideCustomer = false,
}: {
  sales: RetailSalePage;
  /** Whether to show Void buttons: checkPermission(role, "VOID_RETAIL_SALE"). */
  canVoid?: boolean;
  /** On a customer's own page, where the customer is already known. */
  hideCustomer?: boolean;
}) {
  const right = "text-right font-mono";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale</TableHead>
              <TableHead>When</TableHead>
              {!hideCustomer && <TableHead>Customer</TableHead>}
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Sold By</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hideCustomer ? 9 : 10}
                  className="py-10 text-center text-muted-foreground"
                >
                  No retail sales yet.
                </TableCell>
              </TableRow>
            ) : (
              sales.rows.map((sale) => {
                const voided = !!sale.voidedAt;
                return (
                  <TableRow
                    key={sale.saleId}
                    className={voided ? "text-muted-foreground" : undefined}
                  >
                    <TableCell>
                      <MonoText>#{sale.saleId}</MonoText>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(sale.soldAt)}
                    </TableCell>
                    {!hideCustomer && (
                      <TableCell>
                        <Link
                          href={`/customers/${sale.customerId}`}
                          className="font-medium hover:underline"
                        >
                          {sale.customer?.name ?? "[Deleted]"}
                        </Link>
                      </TableCell>
                    )}
                    <TableCell className="whitespace-normal">
                      {(sale.items ?? [])
                        .map(
                          (item) =>
                            `${item.product?.name ?? "Unknown product"} × ${item.quantity}`,
                        )
                        .join(", ")}
                    </TableCell>
                    <TableCell className={right}>
                      {formatPeso(sale.subtotal)}
                    </TableCell>
                    <TableCell className={right}>
                      {sale.discount > 0 ? `-${formatPeso(sale.discount)}` : "—"}
                    </TableCell>
                    <TableCell
                      className={`${right} font-semibold ${voided ? "line-through" : ""}`}
                    >
                      {formatPeso(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {methodLabel(sale.paymentMethod)}
                      {sale.paymentNotes && (
                        <span className="block text-xs text-muted-foreground">
                          {sale.paymentNotes}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{sale.soldByUser?.name ?? "Not recorded"}</TableCell>
                    <TableCell className="whitespace-normal">
                      {voided ? (
                        <div className="space-y-0.5">
                          <Badge variant="destructive">Voided</Badge>
                          <span className="block text-xs">
                            {sale.voidedByUser?.name ?? "Not recorded"}:{" "}
                            {sale.voidReason}
                          </span>
                        </div>
                      ) : (
                        canVoid && <VoidRetailSaleButton saleId={sale.saleId} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {sales.pagination.totalPages > 1 && <Pager initial={sales.pagination} />}
    </div>
  );
}
