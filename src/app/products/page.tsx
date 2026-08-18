import { initDatabase } from "@/backend/db/database";
import { ProductInventory } from "@/backend/models";
import { EquipmentService, ProductService } from "@/backend/services";
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
import EquipmentLedgerReports from "@/features/products/components/EquipmentLedgerReports";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { InventoryAdjustmentModal } from "@/features/products/components/InventoryAdjustmentModal";
import { InventoryAdjustmentModalButton } from "@/features/products/components/InventoryAdjustmentModalButton";
import { ProductFormModal } from "@/features/products/components/ProductFormModal";
import { ProductFormModalButton } from "@/features/products/components/ProductFormModalButton";
import { PAGINATION, UserRole } from "@/lib/definitions";
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

interface ProductPageProps {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    startDate?: string;
    endDate?: string;
    productId?: number;
    customerId?: number;
    actionType?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductPageProps) {
  await initDatabase();
  const params = await searchParams;

  const page = Number(params?.page) || PAGINATION.PAGE;
  const limit = Number(params?.limit) || PAGINATION.PAGE_SIZE;

  let products: any[] = [];
  const logsPromise: Promise<Paginated<any>> = EquipmentService.getAll({
    limit,
    page,
    query: {
      actionType: params?.actionType,
      customerId: params?.customerId,
      productId: params?.productId,
    },
  });

  const reportsPromise = Promise.all([
    EquipmentService.getBalanceSheetReport(),
    EquipmentService.getCustomerLiabilityAgingReport(),
    EquipmentService.getShrinkageRateReport(),
  ]).then(([balanceSheet, agingReport, shrinkageReport]) => ({
    balanceSheet,
    agingReport,
    shrinkageReport,
  }));

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
            Product Catalog & Equipment Ledger
          </h1>
          <p className="text-muted-foreground">
            Manage refill products, double-entry equipment ledger transfers, and
            inventory audit reports.
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
        {/* <TabsList>
          <TabsTrigger value="equipmentLogs">
            Equipment Movement Ledger
          </TabsTrigger>
          <TabsTrigger value="pattern1Reports" className="gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            Ledger Reports
          </TabsTrigger>
        </TabsList> */}
        <TabsContent value="equipmentLogs">
          <EquipmentLogs logsPromise={logsPromise} />
        </TabsContent>
        <TabsContent value="pattern1Reports">
          <EquipmentLedgerReports reportsPromise={reportsPromise} />
        </TabsContent>
      </Tabs>
      <ProductFormModal />
      <InventoryAdjustmentModal />
    </div>
  );
}
