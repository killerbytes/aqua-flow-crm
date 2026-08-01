import { ArrowLeft, BadgePercent, ClockAlert, Package } from "lucide-react";
import Link from "next/link";

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
import CustomerDetailsActions from "@/features/customers/components/CustomerDetails/CustomerDetailsActions";
import { CustomerFormModal } from "@/features/customers/components/CustomerFormModal";
import OrderList from "@/features/orders/components/OrderList";
import EquipmentLogs from "@/features/products/components/EquipmentLogs";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let customer;

  try {
    customer = await CustomerService.get(id);
  } catch (err) {
    console.log(err);

    customer = { rows: [], pagination: { total: 0, currentPage: 0 } };
  }
  if (!customer) redirect("/customers");
  console.log(customer);

  const products = await ProductService.getProducts();
  const logsPromise = EquipmentService.getAll({
    query: {
      customerId: Number(id),
    },
  });
  const orders = await OrderService.getAll({
    query: {
      customerId: Number(id),
    },
  });
  const barangays = CommonService.getBarangays();

  const activeRegularBalances =
    customer?.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityOwed ?? 0) > 0,
    ) || [];

  const activeTemporaryBalances =
    customer?.equipmentBalances?.filter(
      (b: CustomerEquipmentBalance) => (b.quantityTemporaryOwed ?? 0) > 0,
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
        <h1 className="text-2xl font-bold tracking-tight">
          {customer?.name || "Customer Profile"}
        </h1>
        <p className="text-muted-foreground">
          Viewing profile for Customer ID: #{customer.customerId}
        </p>
        <CustomerDetailsActions customer={customer} products={products} />
        {customer && (
          <div className="pt-4 border-t space-y-2 text-sm">
            <p>
              <strong>Address:</strong> {customer.address}
            </p>
            <p>
              <strong>Barangay:</strong> {customer.barangay}
            </p>
            <p>
              <strong>Phone:</strong> {customer.phone}
            </p>
            <p>
              <strong>Status:</strong> {customer.status}
            </p>
            {customer.notes && (
              <p>
                <strong>Notes:</strong> {customer.notes}
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
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60">
                          {balance.quantityTemporaryOwed} temp
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
            {/* Regular Borrowed Inventory */}
            <div className="pt-4 border-t space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package size={16} /> Regular Borrowed Inventory
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
                    ),
                  )}
                </div>
              )}
            </div>
            <div className="pt-4 border-t space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BadgePercent size={16} /> Special Pricing
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
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight">Equipment Logs</h2>
      </div>

      <EquipmentLogs logsPromise={logsPromise} />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight">Orders</h2>
      </div>

      <OrderList orders={orders} />

      <CustomerFormModal barangays={barangays} />
    </>
  );
}
