"use client";

import {
  createRetailSaleAction,
  getRetailProductsAction,
} from "@/backend/actions";
import {
  RetailSaleFormData,
  RetailSaleSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { OrderCustomerLookupButton } from "@/features/orders/components/OrderCustomerLookupButton";
import {
  CustomerStatus,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from "@/lib/definitions";
import { fromCents, formatPeso, toCents } from "@/lib/money";
import { useUIStore } from "@/store/uiStore";
import type { RetailProduct } from "@/types/models";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";

type SaleForm = UseFormReturn<RetailSaleFormData>;

/** The first row, before the products have loaded. */
const UNSET_ITEM = { productId: 0, quantity: 1 };

/**
 * The bill as the form shows it. The server prices the sale again from its own
 * base prices, so this is only a preview.
 */
const billOf = (
  items: { productId?: number; quantity?: number }[] | undefined,
  products: RetailProduct[],
  discount: number | undefined,
) => {
  const subtotalCents = (items ?? []).reduce((sum, item) => {
    const product = products.find((p) => p.productId === item?.productId);
    return sum + toCents(product?.basePrice) * (item?.quantity || 0);
  }, 0);
  const discountCents = toCents(discount);
  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    total: fromCents(Math.max(0, subtotalCents - discountCents)),
    tooMuchDiscount: discountCents > subtotalCents,
  };
};

/** The product and quantity rows, with the Add Item button. */
function SaleItemsField({
  form,
  products,
}: {
  form: SaleForm;
  products: RetailProduct[];
}) {
  const {
    control,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const itemErrors = errors.items;

  return (
    <div>
      <FieldLabel className="mb-2">Items</FieldLabel>
      <div className="space-y-2">
        {fields.map((fieldItem, idx) => {
          const usedElsewhere = items
            .filter((_, i) => i !== idx)
            .map((item) => Number(item?.productId));
          const selected = products.find(
            (p) => p.productId === Number(items[idx]?.productId),
          );

          return (
            <div
              key={fieldItem.id}
              className="flex flex-col gap-1 rounded-xl border bg-slate-50/50 p-3 dark:bg-slate-900/50"
            >
              <div className="flex items-start gap-2">
                <FieldGroup className="flex flex-1 flex-row gap-2">
                  <Controller
                    name={`items.${idx}.productId`}
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <Select
                          value={field.value > 0 ? String(field.value) : ""}
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                        >
                          <SelectTrigger
                            aria-invalid={!!itemErrors?.[idx]?.productId}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select product...">
                              {(value) =>
                                products.find(
                                  (p) => String(p.productId) === String(value),
                                )?.name
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(
                                (p) =>
                                  p.productId === Number(field.value) ||
                                  !usedElsewhere.includes(p.productId),
                              )
                              .map((p) => (
                                <SelectItem
                                  key={p.productId}
                                  value={String(p.productId)}
                                  disabled={p.stockOnHand <= 0}
                                >
                                  {p.name} ({formatPeso(p.basePrice)}
                                  {" · "}
                                  {p.stockOnHand > 0
                                    ? `${p.stockOnHand} in stock`
                                    : "out of stock"}
                                  )
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FieldError>
                          {itemErrors?.[idx]?.productId?.message}
                        </FieldError>
                      </Field>
                    )}
                  />
                  <Controller
                    name={`items.${idx}.quantity`}
                    control={control}
                    render={({ field }) => (
                      <Field className="w-1/4">
                        <Input
                          type="number"
                          min={1}
                          max={selected?.stockOnHand}
                          step={1}
                          {...field}
                          aria-invalid={!!itemErrors?.[idx]?.quantity}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                        <FieldError>
                          {itemErrors?.[idx]?.quantity?.message}
                        </FieldError>
                      </Field>
                    )}
                  />
                </FieldGroup>
                {fields.length > 1 && (
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    aria-label="Remove item"
                    onClick={() => remove(idx)}
                    className="shrink-0 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
              {selected && (
                <span className="text-xs text-muted-foreground">
                  {formatPeso(selected.basePrice)} ×{" "}
                  {items[idx]?.quantity || 0} ={" "}
                  {formatPeso(
                    fromCents(
                      toCents(selected.basePrice) *
                        (items[idx]?.quantity || 0),
                    ),
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {fields.length < products.length && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => append({ productId: 0, quantity: 1 })}
        >
          <Plus size={14} /> Add Item
        </Button>
      )}
    </div>
  );
}

const RetailSaleModalContent = () => {
  const router = useRouter();
  const { setRetailSaleModalOpen, lookupCustomers } = useUIStore();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<RetailProduct[]>([]);

  const form = useForm<RetailSaleFormData>({
    resolver: zodResolver(RetailSaleSchema),
    defaultValues: {
      customerId: undefined,
      items: [UNSET_ITEM],
      discount: undefined,
      paymentMethod: PaymentMethod.CASH,
      paymentNotes: "",
    },
  });
  const { control, handleSubmit, setValue, getValues, formState } = form;

  // Loads the products, and points the untouched first row at the first one
  // still in stock.
  useEffect(() => {
    let cancelled = false;
    getRetailProductsAction().then((res) => {
      if (cancelled || !res.success) return;
      setProducts(res.data);
      const first = res.data.find((p) => p.stockOnHand > 0);
      if (first && getValues("items.0.productId") === UNSET_ITEM.productId) {
        setValue("items.0.productId", first.productId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getValues, setValue]);

  const items = useWatch({ control, name: "items" });
  const discount = useWatch({ control, name: "discount" });
  const customerId = useWatch({ control, name: "customerId" });
  const customer = lookupCustomers.find((c) => c.customerId === customerId);
  const isInactiveCustomer = customer?.status === CustomerStatus.INACTIVE;
  const bill = billOf(items, products, discount);

  const onSubmit = (data: RetailSaleFormData) => {
    startTransition(async () => {
      const res = await createRetailSaleAction(data);
      if (!res.success) {
        const fieldError = Object.values(res.fieldErrors ?? {}).flat()[0];
        toast.add({
          type: "error",
          priority: "high",
          title: fieldError ?? res.error,
        });
        return;
      }
      toast.add({
        type: "success",
        title: `Retail sale #${res.data.saleId} recorded: ${formatPeso(res.data.totalAmount)}`,
      });
      setRetailSaleModalOpen(false);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
      <Field>
        <FieldLabel>Customer</FieldLabel>
        <div className="flex items-center gap-2">
          <OrderCustomerLookupButton form={form}>
            <span className="flex w-full items-center justify-start gap-2">
              {customerId ? (
                customer?.name ?? `Customer #${customerId}`
              ) : (
                <>
                  <Search /> Walk-in (choose a customer...)
                </>
              )}
            </span>
          </OrderCustomerLookupButton>
          {customerId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to walk-in"
              onClick={() => setValue("customerId", undefined)}
            >
              <X />
            </Button>
          )}
        </div>
        {isInactiveCustomer && (
          <FieldError>
            Customer is inactive. Set them active or sell as walk-in.
          </FieldError>
        )}
      </Field>

      <SaleItemsField form={form} products={products} />

      <div className="space-y-2 border-t pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{formatPeso(bill.subtotal)}</span>
        </div>
        <Controller
          name="discount"
          control={control}
          render={({ field }) => (
            <Field data-invalid={bill.tooMuchDiscount || !!formState.errors.discount}>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="retail-discount">Discount (P)</FieldLabel>
                <Input
                  id="retail-discount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="w-32 text-right"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                />
              </div>
              <FieldError>
                {bill.tooMuchDiscount
                  ? "The discount can't be more than the subtotal"
                  : formState.errors.discount?.message}
              </FieldError>
            </Field>
          )}
        />
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-xs font-medium text-muted-foreground">
            Total to collect
          </span>
          <span className="text-2xl font-bold text-green-500">
            {formatPeso(bill.total)}
          </span>
        </div>
      </div>

      <Controller
        name="paymentMethod"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Payment Method</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(PaymentMethod).map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{formState.errors.paymentMethod?.message}</FieldError>
          </Field>
        )}
      />

      <Controller
        name="paymentNotes"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Notes (optional)</FieldLabel>
            <Textarea
              {...field}
              rows={2}
              placeholder="e.g. GCash reference number, reason for the discount"
            />
          </Field>
        )}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRetailSaleModalOpen(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || bill.tooMuchDiscount || isInactiveCustomer}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          {isPending ? "Recording..." : "Record Sale"}
        </Button>
      </div>
    </form>
  );
};

export const RetailSaleModal = () => {
  const { isRetailSaleModalOpen, setRetailSaleModalOpen } = useUIStore();

  // The content mounts on open, so each sale starts from a fresh form.
  if (!isRetailSaleModalOpen) return null;

  return (
    <Modal
      title={
        <>
          <ShoppingBag />
          Retail Sale
        </>
      }
      description="Sell brand-new items over the counter. The sale is paid in full now and the units leave stock."
      isOpen={isRetailSaleModalOpen}
      onClose={() => setRetailSaleModalOpen(false)}
    >
      <RetailSaleModalContent />
    </Modal>
  );
};
