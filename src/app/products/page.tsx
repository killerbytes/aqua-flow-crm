import { initDatabase } from "@/backend/db/database";
import {
  EquipmentLog,
  InventoryAdjustment,
  ProductInventory,
} from "@/backend/models";
import { EquipmentService, ProductService } from "@/backend/services";
import { InventoryService } from "@/backend/services/inventory.service";
import {
  InventoryAdjustmentModalButton,
  ProductFormModalButton,
} from "@/components/ActionButtons";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { InventoryAdjustmentModal } from "@/features/products/components/InventoryAdjustmentModal";
import InventoryLogs from "@/features/products/components/InventoryLogs";
import { ProductFormModal } from "@/features/products/components/ProductFormModal";
import { UserRole } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { Paginated } from "@/types";
import {
  CogIcon,
  Edit,
  Package,
  Plus,
  ShieldAlert,
  Store,
  User,
  WarehouseIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await initDatabase();

  let products: any[] = [];
  const logsPromise: Promise<Paginated<EquipmentLog>> =
    EquipmentService.getAll();

  const inventoryAdjustmentPromise: Promise<Paginated<InventoryAdjustment>> =
    InventoryService.getAll();
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
        <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
          <ProductFormModalButton>
            <Plus className="w-4 h-4" />
            Add Product
          </ProductFormModalButton>
        </RoleGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium">No products in catalog.</p>
          </div>
        ) : (
          products.map((prod: ProductInventory) => (
            <Card key={prod.productId} className="flex justify-between ">
              <CardHeader>
                <CardDescription className="flex items-center gap-2 font-semibold">
                  {prod.name}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatCurrency(prod.unitPrice)}
                </CardTitle>
                <CardAction>
                  <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.CASHIER]}>
                    <div className="flex gap-2">
                      <ProductFormModalButton product={prod} variant="outline">
                        <Edit />
                      </ProductFormModalButton>
                      <InventoryAdjustmentModalButton
                        product={prod}
                        variant="outline"
                      >
                        <CogIcon />
                      </InventoryAdjustmentModalButton>
                    </div>
                  </RoleGuard>
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-2">
                <Tabs defaultValue="stocks">
                  {prod.stockDamaged + prod.stockLost > 0 && (
                    <TabsList variant="line">
                      <TabsTrigger value="stocks">
                        <WarehouseIcon /> Stocks
                      </TabsTrigger>
                      <TabsTrigger value="damaged">
                        <ShieldAlert /> Losses (
                        {prod.stockDamaged + prod.stockLost})
                      </TabsTrigger>
                    </TabsList>
                  )}

                  <TabsContent value="stocks" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-accent-foreground" />
                        Station
                      </span>
                      <span className="font-bold text-accent-foreground bg-accent px-2.5 py-0.5 rounded-full border border-accent-foreground/20">
                        {prod.stockInStation} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Customers
                      </span>
                      <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                        {prod.stockWithCustomers} units
                      </span>
                    </div>
                  </TabsContent>
                  <TabsContent value="damaged" className="space-y-2">
                    {prod.stockDamaged > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                          Damaged Stock:
                        </span>
                        <span className="font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                          {prod.stockDamaged} units
                        </span>
                      </div>
                    )}
                    {prod.stockLost > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />{" "}
                          Lost Stock:
                        </span>
                        <span className="font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                          {prod.stockLost} units
                        </span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="equipmentLogs">
        <TabsList>
          <TabsTrigger value="equipmentLogs">Equipment Logs</TabsTrigger>
          <TabsTrigger value="inventoryLogs">Inventory Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="equipmentLogs">
          <EquipmentLogs logsPromise={logsPromise} />
        </TabsContent>
        <TabsContent value="inventoryLogs">
          <InventoryLogs
            inventoryAdjustmentPromise={inventoryAdjustmentPromise}
          />
        </TabsContent>
      </Tabs>
      <ProductFormModal />
      <InventoryAdjustmentModal />
    </div>
  );
}
