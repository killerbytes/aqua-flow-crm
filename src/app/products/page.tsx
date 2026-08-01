import { initDatabase } from "@/backend/db/database";
import { EquipmentLog, ProductInventory } from "@/backend/models";
import { EquipmentService, ProductService } from "@/backend/services";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardListActions } from "@/features/products/components/CardListActions";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { ProductFormModal } from "@/features/products/components/ProductFormModal";
import { ProductListActions } from "@/features/products/components/ProductListActions";
import { formatCurrency } from "@/lib/utils";
import { Paginated } from "@/types";
import { Package, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await initDatabase();

  let products: any[] = [];
  const logsPromise: Promise<Paginated<EquipmentLog>> =
    EquipmentService.getAll();

  try {
    products = await ProductService.getAll();
  } catch (err) {
    products = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package />
            Product Catalog & Pricing
          </h1>
          <p className="text-muted-foreground">
            Manage refill products, unit pricing, station stock inventory, and
            special pricing.
          </p>
        </div>
        <ProductListActions />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium">No products in catalog.</p>
          </div>
        ) : (
          products.map((prod: ProductInventory) => (
            <Card key={prod.productId}>
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="flex items-center gap-2">
                    {prod.name}
                  </CardTitle>
                </div>
                <CardDescription>
                  {formatCurrency(prod.unitPrice)}
                </CardDescription>
                <CardAction>
                  <CardListActions product={prod} />
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" /> Station
                  </span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {prod.stockInStation} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Customers
                  </span>
                  <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    {prod.stockWithCustomers} units
                  </span>
                </div>

                {/* <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />{" "}
                    Damaged Stock:
                  </span>
                  <span className="font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    {prod.stockDamaged} units
                  </span>
                </div> */}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <EquipmentLogs logsPromise={logsPromise} />

      <ProductFormModal />
    </div>
  );
}
