"use client";

import { createOrderAction, updateOrderAction } from "@/backend/actions";
import { OrderFormData, OrderSchema } from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, ShoppingBag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { OrderCustomerLookupButton } from "./OrderCustomerLookupButton";
import {
  OrderItemsField,
  orderTotal,
  UNSET_ORDER_ITEM,
  useOrderProducts,
} from "./OrderItemsField";
import {
  DEFAULT_ORDER_SURCHARGE,
  OrderSurchargeField,
} from "./OrderSurchargeField";

const hasContainersOut = (balance: any) =>
  (balance.quantityOwed ?? 0) > 0 || (balance.quantityTemporaryOwed ?? 0) > 0;

const OrderFormModalContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    setOrderFormModalOpen,
    lookupCustomers,
    orderCustomer: presetCustomer,
    editingOrder,
  } = useUIStore();
  const [isPending, startTransition] = useTransition();
  // An order being edited keeps its customer, so it stands in as the preset.
  const orderCustomer = editingOrder?.customer ?? presetCustomer;

  const form = useForm({
    resolver: zodResolver(OrderSchema),
    defaultValues: editingOrder
      ? {
          customerId: editingOrder.customerId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          // Previewed at today's prices, which is what saving will charge.
          items: editingOrder.orderDetails.map((d: any) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: Number(d.product?.unitPrice ?? d.unitPrice),
          })),
          surcharge: Number(editingOrder.surcharge) || 0,
        }
      : {
          customerId: orderCustomer?.customerId ?? 0,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          items: [UNSET_ORDER_ITEM],
          surcharge: DEFAULT_ORDER_SURCHARGE,
        },
  });
  const { handleSubmit, control, formState } = form;
  const products = useOrderProducts(form);

  const items = useWatch({ control, name: "items" });
  const customerId = useWatch({ control, name: "customerId" });
  const surcharge = useWatch({ control, name: "surcharge" }) ?? 0;

  // A preset customer isn't in the lookup results until someone searches.
  const customer =
    lookupCustomers.find((c) => c.customerId === customerId) ??
    (orderCustomer?.customerId === customerId ? orderCustomer : undefined);
  const balancesOut = (customer?.equipmentBalances ?? []).filter(
    hasContainersOut,
  );

  const onSubmit = async (data: OrderFormData) => {
    startTransition(async () => {
      try {
        if (editingOrder) {
          const res = await updateOrderAction(editingOrder.orderId, {
            items: data.items,
            surcharge: data.surcharge,
          });
          if (!res.success) {
            throw new Error(res.error);
          }
          toast.add({ title: `Order #${editingOrder.orderId} updated` });
          setOrderFormModalOpen(false);
          router.refresh();
          return;
        }

        const res = await createOrderAction(data);
        if (!res.success) {
          throw new Error(res.error);
        }
        toast.add({
          title: "Order Created",
        });
        setOrderFormModalOpen(false);
        // From elsewhere (e.g. a customer page), go to the orders list. On the
        // list itself, refresh so its filters stay as they are.
        if (pathname === "/orders") {
          router.refresh();
        } else {
          router.push("/orders");
        }
      } catch (error: any) {
        toast.add({
          type: "error",
          priority: "high",
          description:
            error.message ||
            (editingOrder ? "Failed to update order" : "Failed to create order"),
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup className="gap-2">
        <Field data-invalid={!!formState.errors.customerId?.message}>
          <FieldLabel>Customer</FieldLabel>
          {editingOrder ? (
            // The customer of an existing order can't be changed.
            <div className="text-sm font-medium">{customer?.name}</div>
          ) : (
            <OrderCustomerLookupButton form={form}>
              <FieldLabel className="w-full cursor-pointer justify-start">
                {customer?.name || (
                  <div className="flex justify-start gap-2 items-center">
                    <Search /> Select customer...
                  </div>
                )}
              </FieldLabel>
            </OrderCustomerLookupButton>
          )}
        </Field>

        {balancesOut.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {balancesOut.map((b: any) => (
              <span
                key={b.balanceId || b.productId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground border font-mono text-[11px]"
              >
                <span className="font-semibold text-foreground">
                  {b.product?.name || `Product #${b.productId}`}:
                </span>
                {(b.quantityOwed ?? 0) > 0 && (
                  <span className="font-semibold text-primary">
                    {b.quantityOwed} owed
                  </span>
                )}
                {(b.quantityOwed ?? 0) > 0 &&
                  (b.quantityTemporaryOwed ?? 0) > 0 && <span>•</span>}
                {(b.quantityTemporaryOwed ?? 0) > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {b.quantityTemporaryOwed} temp
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </FieldGroup>

      <OrderItemsField
        form={form}
        products={products}
        specialPricings={customer?.specialPricings}
      />

      <OrderSurchargeField
        form={form}
        initial={editingOrder ? Number(editingOrder.surcharge) || 0 : undefined}
      />

      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs text-muted-foreground">Total Amount:</span>
        <span className="text-lg font-bold font-mono text-primary">
          {formatCurrency(
            orderTotal(items, customer?.specialPricings) + surcharge,
          )}
        </span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOrderFormModalOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {editingOrder
            ? isPending
              ? "Saving..."
              : "Save Changes"
            : isPending
              ? "Placing Order..."
              : "Create Order"}
        </Button>
      </div>
    </form>
  );
};

export function OrderFormModal() {
  const { isOrderModalOpen, setOrderFormModalOpen, editingOrder } =
    useUIStore();

  // The content mounts on open, so each order starts from a fresh form.
  if (!isOrderModalOpen) return null;

  return (
    <Modal
      title={
        <>
          <ShoppingBag />
          {editingOrder ? `Edit Order #${editingOrder.orderId}` : "Create Order"}
        </>
      }
      description={
        editingOrder
          ? "Change the items or surcharge of this pending order"
          : "Place a new water refill order"
      }
      isOpen={isOrderModalOpen}
      onClose={() => setOrderFormModalOpen(false)}
    >
      <OrderFormModalContent />
    </Modal>
  );
}
