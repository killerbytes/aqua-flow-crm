"use client";

import { getProductsAction } from "@/backend/actions";
import type { ProductInventory } from "@/backend/models";
import type { OrderSchema } from "@/backend/schemas/zodSchemas";
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
import { formatCurrency } from "@/lib/utils";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

type OrderForm = UseFormReturn<
  z.input<typeof OrderSchema>,
  unknown,
  z.output<typeof OrderSchema>
>;

interface SpecialPricing {
  productId: number;
  discountAmount: number | string;
}

interface OrderItem {
  productId?: number;
  quantity?: number;
  unitPrice?: number;
}

/** The first row of a new order form, before the products have loaded. */
export const UNSET_ORDER_ITEM = { productId: -1, quantity: 1 };

const discountFor = (
  specialPricings: SpecialPricing[] | undefined,
  productId: unknown,
) => {
  const pricing = specialPricings?.find(
    (p) => Number(p.productId) === Number(productId),
  );
  return pricing ? Number(pricing.discountAmount) : 0;
};

/**
 * What the form shows as the total. The server works out the real amount from
 * its own prices, so this is only a preview.
 */
export const orderTotal = (
  items: OrderItem[] | undefined,
  specialPricings?: SpecialPricing[],
) =>
  (items || []).reduce((sum, item) => {
    const netPrice = Math.max(
      0,
      (item?.unitPrice ?? 0) - discountFor(specialPricings, item?.productId),
    );
    return sum + (item?.quantity || 0) * netPrice;
  }, 0);

/**
 * Loads the products an order can use, and points the form's untouched first
 * row at the first one. Call it from a component that mounts when its modal
 * opens.
 */
export function useOrderProducts(form: OrderForm) {
  const [products, setProducts] = useState<ProductInventory[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProductsAction().then((res) => {
      if (cancelled || !res.success) return;
      setProducts(res.data);
      const first = res.data[0];
      if (
        first &&
        form.getValues("items.0.productId") === UNSET_ORDER_ITEM.productId
      ) {
        form.setValue("items.0.productId", first.productId);
        form.setValue("items.0.unitPrice", Number(first.unitPrice));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [form]);

  return products;
}

/** The product and quantity rows of an order form, with the Add Item button. */
export function OrderItemsField({
  form,
  products,
  specialPricings,
}: {
  form: OrderForm;
  products: ProductInventory[];
  /** The selected customer's special prices, shown against matching rows. */
  specialPricings?: SpecialPricing[];
}) {
  const {
    control,
    setValue,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items: OrderItem[] = useWatch({ control, name: "items" }) || [];
  const itemErrors = errors.items as any;

  const sellable = products.filter((product) => !product.isLendOnly);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <FieldLabel>Order Items</FieldLabel>
      </div>

      <div className="space-y-3">
        {fields.map((fieldItem, idx) => {
          const usedElsewhere = items
            .filter((_, i) => i !== idx)
            .map((item) => Number(item?.productId));
          const discount = discountFor(specialPricings, items[idx]?.productId);

          return (
            <div
              key={fieldItem.id}
              className="flex flex-col gap-1.5 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50"
            >
              <div className="flex gap-3 items-center">
                <FieldGroup className="flex flex-row gap-2 flex-1">
                  <Controller
                    name={`items.${idx}.productId`}
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <Select
                          value={field.value > 0 ? String(field.value) : ""}
                          onValueChange={(value) => {
                            const productId = Number(value);
                            field.onChange(productId);
                            const product = products.find(
                              (p) => p.productId === productId,
                            );
                            setValue(
                              `items.${idx}.unitPrice`,
                              Number(product?.unitPrice || 0),
                            );
                          }}
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
                            {sellable
                              .filter(
                                (p) =>
                                  p.productId === Number(field.value) ||
                                  !usedElsewhere.includes(Number(p.productId)),
                              )
                              .map((p) => (
                                <SelectItem
                                  key={p.productId}
                                  value={String(p.productId)}
                                >
                                  {p.name} ({formatCurrency(p.unitPrice)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
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
                          min="1"
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
                    onClick={() => remove(idx)}
                    className="text-red-600 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>

              {discount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-800/60">
                  <Tag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>
                    Special Discount: -{formatCurrency(discount)} / unit
                  </span>
                  <span className="text-muted-foreground text-[11px] ml-auto">
                    (Net:{" "}
                    {formatCurrency(
                      Math.max(0, (items[idx]?.unitPrice ?? 0) - discount),
                    )}
                    )
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => append({ productId: 0, quantity: 1, unitPrice: 0 })}
      >
        <Plus size={14} /> Add Item
      </Button>
    </div>
  );
}
