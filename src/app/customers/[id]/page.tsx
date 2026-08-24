import {
  ArrowLeft,
  ArrowRightLeft,
  ClockAlert,
  DollarSign,
  Edit,
  Package,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { initDatabase } from "@/backend/db/database";
import {
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
} from "@/backend/models";
import {
  CustomerService,
  EquipmentService,
  OrderService,
  ProductService,
} from "@/backend/services";
import { CommonService } from "@/backend/services/commonService";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ColorBadge } from "@/components/presentation";
import TabWrapper from "@/components/TabWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import { CustomerFormModalButton } from "@/features/customers/components/CustomerFormModalButton";
import { LogEquipmentModal } from "@/features/customers/components/LogEquipmentModal";
import { LogEquipmentModalButton } from "@/features/customers/components/LogEquipmentModalButton";
import { SpecialPricingModal } from "@/features/customers/components/SpecialPricingModal";
import { SpecialPricingModalButton } from "@/features/customers/components/SpecialPricingModalButton";
import { InvoiceFormModal } from "@/features/invoices/components/InvoiceFormModal";
import { InvoiceFormModalButton } from "@/features/invoices/components/InvoiceFormModalButton";
import OrderList from "@/features/orders/components/OrderList";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { CUSTOMER_STATUS_BADGE_COLOR, UserRole } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    limit?: number;
    page?: number;
    sort?: string;
    order?: "ASC" | "DESC";
  }>;
}) {
  await initDatabase();
  const { id } = await params;
  const { tab, limit, page, sort, order } = await searchParams;
  let customer;

  try {
    customer = await CustomerService.get(id);
  } catch (err) {
    console.log(err);
    customer = null;
  }
  if (!customer || !customer.customerId) redirect("/customers");

  const products = await ProductService.getAll();
  const logsPromise = EquipmentService.getAll({
    limit,
    page,
    sort,
    order,
    query: {
      customerId: Number(id),
    },
  });
  const orders = await OrderService.getAll({
    limit,
    page,
    sort,
    order,
    query: {
      customerId: Number(id),
    },
  });
  //   const invoiceOrders =  getOrdersAction({
  //   query: {
  //     customerId: Number(id),
  //   },
  // });
  const barangays = CommonService.getBarangays();

  const activeRegularBalances =
    customer?.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityOwed ?? 0) > 0
    ) || [];

  const activeTemporaryBalances =
    customer?.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityTemporaryOwed ?? 0) > 0
    ) || [];

  return (
    <>
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Back to Customers
      </Link>
      {/* <CustomerDetailsActions customer={customer} /> */}
      <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="md:flex space-y-4 justify-between items-center">
          <h1 className=" flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {customer?.name || "Customer Profile"}
            </span>
            <ColorBadge colorMap={CUSTOMER_STATUS_BADGE_COLOR}>
              {customer.status}
            </ColorBadge>
          </h1>

          <RoleGuard
            allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}
          >
            <div className="flex flex-wrap gap-2">
              <CustomerFormModalButton customer={customer} variant="outline">
                <Edit className="w-4 h-4" />
                Edit Customer
              </CustomerFormModalButton>
              <InvoiceFormModalButton customer={customer} variant="outline">
                <DollarSign className="w-4 h-4" />
                Create Invoice
              </InvoiceFormModalButton>
              <SpecialPricingModalButton customer={customer} variant="outline">
                <Tag className="w-4 h-4 text-orange-500" />
                Special Discount
              </SpecialPricingModalButton>

              <LogEquipmentModalButton
                customerId={customer.customerId}
                variant="secondary"
              >
                <ArrowRightLeft size={16} /> Log Equipment
              </LogEquipmentModalButton>
            </div>
          </RoleGuard>
        </div>
        {customer && (
          <div className="pt-4 border-t space-y-2 text-sm ">
            <p>
              <strong>Address:</strong> {customer.address}
            </p>
            <p>
              <strong>Barangay:</strong> {customer.barangay}
            </p>
            <p>
              <strong>Phone:</strong> {customer.phone}
            </p>
            {customer.notes && (
              <p className="flex gap-2">
                <strong className="font-medium">Notes:</strong>{" "}
                <span className="whitespace-pre-wrap">{customer.notes}</span>
              </p>
            )}

            {/* Temporary Equipment Loans (Immediate Retrieval Required) */}
            {activeTemporaryBalances.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <ClockAlert size={16} /> Temporary Loans (Immediate Retrieval)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeTemporaryBalances.map(
                    (balance: CustomerEquipmentBalance) => (
                      <div
                        key={`temp-${balance.balanceId}`}
                        className="p-3 border border-amber-300 dark:border-amber-700 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between"
                      >
                        <span className="font-medium text-xs text-amber-900 dark:text-amber-200">
                          {balance.product?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60">
                            {balance.quantityTemporaryOwed} temp
                          </span>
                          <RoleGuard
                            allowedRoles={[
                              UserRole.ADMIN,
                              UserRole.MANAGER,
                              UserRole.CASHIER,
                            ]}
                          >
                            <LogEquipmentModalButton
                              customer={customer}
                              productId={balance.productId}
                              variant="secondary"
                            >
                              <ArrowRightLeft size={16} />
                            </LogEquipmentModalButton>
                          </RoleGuard>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {/* Regular Borrowed Inventory */}
            <div className="pt-4 border-t space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package size={16} /> Equipment
              </h2>
              {activeRegularBalances.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No active regular borrowed equipment.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeRegularBalances.map(
                    (balance: CustomerEquipmentBalance) => (
                      <div
                        key={balance.balanceId}
                        className="p-3 border rounded-xl bg-muted/30 flex items-center justify-between"
                      >
                        <span className="font-medium text-xs">
                          {balance.product?.name}
                        </span>
                        <span className="text-sm font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                          {balance.quantityOwed} owed
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            {customer.specialPricings.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="text-orange-500" size={16} /> Special Discount
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customer.specialPricings.map(
                    (pricing: CustomerSpecialPricing) => (
                      <div
                        key={pricing.pricingId}
                        className="p-3 border rounded-xl bg-muted/30 flex items-center justify-between"
                      >
                        <span className="font-medium text-xs">
                          {pricing.product?.name}
                        </span>
                        <span className="text-sm font-bold text-orange-500 px-2 py-0.5 rounded-md bg-orange-500/10">
                          {formatCurrency(pricing.discountAmount)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TabWrapper defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Equipment Logs</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Logs</CardTitle>
              <CardDescription>Track equipment loan history.</CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentLogs logsPromise={logsPromise} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>View order history</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderList orders={orders} />
            </CardContent>
          </Card>
        </TabsContent>
      </TabWrapper>
      <CustomerFormModal barangays={barangays} />
      <LogEquipmentModal products={products} />
      <SpecialPricingModal products={products} />
      <InvoiceFormModal />
    </>
  );
}
