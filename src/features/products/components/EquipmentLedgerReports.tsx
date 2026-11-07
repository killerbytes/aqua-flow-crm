"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Scale, TrendingDown } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface ReportsData {
  balanceSheet: Array<{
    productId: number;
    productName: string;
    stationStock: number;
    customerOwed: number;
    scrapDamaged: number;
    scrapLost: number;
    totalFleet: number;
    ledger: {
      stationStock: number;
      customerOwed: number;
      scrapDamaged: number;
      scrapLost: number;
    };
    matchesLedger: boolean;
  }>;
  agingReport: Array<{
    customerId: number;
    customerName: string;
    productName: string;
    quantityOwed: number;
    quantityTemporaryOwed: number;
    totalHoldings: number;
    lastActivityDate: string | Date;
    daysIdle: number;
  }>;
  shrinkageReport: Array<{
    productId: number;
    productName: string;
    unitsLost: number;
    unitsDamaged: number;
    totalScrap: number;
    shrinkagePercentage: number;
  }>;
}

interface EquipmentLedgerReportsProps {
  reportsPromise: Promise<ReportsData>;
}

export default function EquipmentLedgerReports({
  reportsPromise,
}: EquipmentLedgerReportsProps) {
  const { balanceSheet, agingReport, shrinkageReport } = use(reportsPromise);
  const drifted = balanceSheet.filter((row) => !row.matchesLedger);

  return (
    <div className="space-y-8">
      {/* 1. Fleet Balance Sheet */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Fleet Balance Sheet
          </CardTitle>
          <CardDescription>
            Real-time mass-conservation breakdown across Station, Customer
            Accounts, and Scrap nodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drifted.length > 0 && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Stock totals don't match the ledger for{" "}
              {drifted.map((row) => row.productName).join(", ")}. The ledger
              shows every recorded movement, so these totals were changed some
              other way.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold text-right">
                    Station Stock
                  </th>
                  <th className="p-3 font-semibold text-right">
                    Customer Holdings
                  </th>
                  <th className="p-3 font-semibold text-right">Damaged</th>
                  <th className="p-3 font-semibold text-right">Lost</th>
                  <th className="p-3 font-semibold text-right">Total Fleet</th>
                  <th className="p-3 font-semibold text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balanceSheet.map((row) => (
                  <tr key={row.productId} className="hover:bg-muted/20">
                    <td className="p-3 font-medium">{row.productName}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="font-mono">
                        {row.stationStock} units
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge className="font-mono bg-blue-500/10 text-blue-400 border-blue-500/30">
                        {row.customerOwed} units
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge className="font-mono bg-purple-500/10 text-purple-400 border-purple-500/30">
                        {row.scrapDamaged} units
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge className="font-mono bg-rose-500/10 text-rose-400 border-rose-500/30">
                        {row.scrapLost} units
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-bold text-cyan-400 font-mono">
                      {row.totalFleet} units
                    </td>
                    <td className="p-3 text-right">
                      {row.matchesLedger ? (
                        <Badge variant="outline">Matches</Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          title={`Ledger: station ${row.ledger.stationStock}, customers ${row.ledger.customerOwed}, damaged ${row.ledger.scrapDamaged}, lost ${row.ledger.scrapLost}`}
                        >
                          Doesn't match
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Customer Liability Aging Report */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Customer Container Liability Aging
            </CardTitle>
            <CardDescription>
              Customers holding container debt sorted by days idle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agingReport.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No active container liabilities found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="p-2.5 font-semibold">Customer</th>
                      <th className="p-2.5 font-semibold">Product</th>
                      <th className="p-2.5 font-semibold text-right">
                        Holdings
                      </th>
                      <th className="p-2.5 font-semibold text-right">
                        Days Idle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agingReport.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          <Link
                            href={`/customers/${item.customerId}`}
                            className="font-medium text-cyan-600 hover:underline"
                          >
                            {item.customerName}
                          </Link>
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {item.productName}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {item.quantityTemporaryOwed}
                        </td>
                        <td className="p-2.5 text-right">
                          <Badge
                            className={
                              item.daysIdle > 30
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : item.daysIdle > 14
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }
                          >
                            {item.daysIdle} days
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Container Loss & Shrinkage Rate Report */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              Container Loss & Shrinkage Rate
            </CardTitle>
            <CardDescription>
              Scrap write-offs and movement leakage analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="p-2.5 font-semibold">Product</th>
                    <th className="p-2.5 font-semibold text-right">Damaged</th>
                    <th className="p-2.5 font-semibold text-right">Lost</th>
                    <th className="p-2.5 font-semibold text-right">
                      Shrinkage Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shrinkageReport.map((row) => (
                    <tr key={row.productId} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium">{row.productName}</td>
                      <td className="p-2.5 text-right font-mono text-purple-400">
                        {row.unitsDamaged}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-400">
                        {row.unitsLost}
                      </td>
                      <td className="p-2.5 text-right">
                        <Badge
                          className={
                            row.shrinkagePercentage > 5
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30 font-mono"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono"
                          }
                        >
                          {row.shrinkagePercentage}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
