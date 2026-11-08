"use client";

import { ColorBadge } from "@/components/presentation";
import { PAYMENT_METHOD_BADGE_COLOR } from "@/lib/definitions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ReversePaymentButton } from "@/features/invoices/components/ReversePaymentButton";

export function OrderPaymentList({ payments }: { payments: any[] }) {
  if (payments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
        No payments recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-2 font-medium">Paid</th>
            <th className="py-2 font-medium">Method</th>
            <th className="py-2 font-medium">Logged by</th>
            <th className="py-2 font-medium text-right">Amount</th>
            <th className="py-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="py-2">{formatDateTime(payment.paidAt)}</td>
              <td className="py-2">
                {payment.paymentMethod ? (
                  <ColorBadge colorMap={PAYMENT_METHOD_BADGE_COLOR}>
                    {payment.paymentMethod}
                  </ColorBadge>
                ) : (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </td>
              <td className="py-2">{payment.user?.name ?? ""}</td>
              <td
                className={
                  payment.reversedAt
                    ? "py-2 text-right font-mono text-muted-foreground line-through"
                    : "py-2 text-right font-mono font-semibold"
                }
              >
                {formatCurrency(payment.amount)}
              </td>
              <td className="py-2 text-right">
                {payment.reversedAt ? (
                  <div className="text-xs">
                    <span className="font-semibold text-destructive">
                      Reversed
                    </span>
                    <div className="text-muted-foreground">
                      {payment.reversedByUser?.name || "N/A"},{" "}
                      {formatDateTime(payment.reversedAt)}:{" "}
                      {payment.reversalReason}
                    </div>
                  </div>
                ) : (
                  <ReversePaymentButton
                    kind="order"
                    paymentId={payment.id}
                    amount={payment.amount}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
