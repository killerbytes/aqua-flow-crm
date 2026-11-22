import { requirePagePermission } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { checkPermission } from "@/backend/rbac/permissions";
import {
  parseDateRange,
  RetailProductService,
  RetailSaleService,
} from "@/backend/services";
import PageHeader from "@/components/shared/PageHeader";
import TabWrapper from "@/components/TabWrapper";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RetailProductFormModal } from "@/features/retail/components/RetailProductFormModal";
import { RetailProductFormModalButton } from "@/features/retail/components/RetailProductFormModalButton";
import RetailSaleDateFilter from "@/features/retail/components/RetailSaleDateFilter";
import RetailSaleList from "@/features/retail/components/RetailSaleList";
import { RetailSaleModal } from "@/features/retail/components/RetailSaleModal";
import { RetailSaleModalButton } from "@/features/retail/components/RetailSaleModalButton";
import RetailStockLog from "@/features/retail/components/RetailStockLog";
import { RetailStockModal } from "@/features/retail/components/RetailStockModal";
import { RetailStockModalButton } from "@/features/retail/components/RetailStockModalButton";
import { businessDateKey } from "@/lib/business-time";
import { formatPeso } from "@/lib/money";
import { parsePageParams } from "@/lib/pagination";
import {
  AlertTriangle,
  Edit,
  Package,
  PackagePlus,
  ShoppingBag,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STOCK_LOG_LIMIT = 25;

interface RetailPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function RetailPage({ searchParams }: RetailPageProps) {
  await initDatabase();
  const user = await requirePagePermission("VIEW_RETAIL");
  const can = {
    sell: checkPermission(user.role, "SELL_RETAIL"),
    manage: checkPermission(user.role, "MANAGE_PRODUCTS"),
    adjust: checkPermission(user.role, "ADJUST_INVENTORY"),
    void: checkPermission(user.role, "VOID_RETAIL_SALE"),
  };

  const params = (await searchParams) ?? {};
  const { page, limit } = parsePageParams(params);
  // Sales open on today's, in Philippine time, until another range is picked.
  const today = businessDateKey(new Date());
  const range = parseDateRange({
    from: params.from ?? today,
    to: params.to ?? today,
  });

  const [products, sales, stockEntries] = await Promise.all([
    RetailProductService.getAll(),
    RetailSaleService.getAll({
      page,
      limit,
      query: { start: range.start, end: range.end },
    }),
    RetailProductService.getStockEntries({ limit: STOCK_LOG_LIMIT }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <PageHeader>
            <ShoppingBag />
            Retail
          </PageHeader>
          <p className="text-sm text-muted-foreground">
            Brand-new containers and other items sold over the counter. Each
            sale is paid in full and takes its units out of stock.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can.manage && (
            <RetailProductFormModalButton variant="outline">
              <PackagePlus size={16} />
              Add Product
            </RetailProductFormModalButton>
          )}
          {can.sell && (
            <RetailSaleModalButton disabled={products.length === 0}>
              <ShoppingBag size={16} />
              Sell
            </RetailSaleModalButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 size-10 opacity-60" />
            <p className="text-sm font-medium">No retail products yet.</p>
            {can.manage && (
              <p className="text-xs">
                Add one, such as a brand-new 5-gallon container, then restock
                it.
              </p>
            )}
          </div>
        ) : (
          products.map((product) => {
            const isLow =
              product.lowStockThreshold !== null &&
              product.stockOnHand <= product.lowStockThreshold;
            return (
              <Card key={product.productId}>
                <CardHeader>
                  <CardDescription className="font-semibold">
                    {product.name}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold">
                    {formatPeso(product.basePrice)}
                  </CardTitle>
                  <CardAction>
                    <div className="flex gap-2">
                      {can.manage && (
                        <RetailProductFormModalButton
                          product={product}
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit />
                        </RetailProductFormModalButton>
                      )}
                      {can.adjust && (
                        <RetailStockModalButton
                          product={product}
                          variant="outline"
                          size="icon"
                          aria-label={`Restock or write off ${product.name}`}
                        >
                          <Warehouse />
                        </RetailStockModalButton>
                      )}
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">In stock</span>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold ${
                        isLow
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border-primary/20 bg-primary/10 text-primary"
                      }`}
                    >
                      {isLow && <AlertTriangle className="size-3.5" />}
                      {product.stockOnHand} units
                    </span>
                  </div>
                  {product.lowStockThreshold !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Low stock warning at {product.lowStockThreshold}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <TabWrapper defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="stock">Stock Log</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>
                {sales.summary.sales} {sales.summary.sales === 1 ? "sale" : "sales"}{" "}
                in this range: {formatPeso(sales.summary.total)} collected,{" "}
                {formatPeso(sales.summary.discounts)} in discounts. Voided
                sales are listed but not counted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RetailSaleDateFilter from={range.from} to={range.to} />
              <RetailSaleList sales={sales} canVoid={can.void} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stock Log</CardTitle>
              <CardDescription>
                The latest {STOCK_LOG_LIMIT} stock movements. The{" "}
                <Link
                  href="/reports/retail-stock"
                  className="font-medium text-primary hover:underline"
                >
                  Retail Stock report
                </Link>{" "}
                has the full history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RetailStockLog entries={stockEntries} />
            </CardContent>
          </Card>
        </TabsContent>
      </TabWrapper>

      <RetailSaleModal />
      <RetailProductFormModal />
      <RetailStockModal />
    </div>
  );
}
