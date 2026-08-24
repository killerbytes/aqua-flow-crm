"use client";

import { createOrderAction, getProductsAction } from "@/backend/actions";
import { ProductInventory } from "@/backend/models";
import { OrderFormData, OrderSchema } from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { cx } from "class-variance-authority";
import { Plus, Search, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { OrderCustomerLookupButton } from "./OrderCustomerLookupButton";

export const OrderFormModalContent = () => {
  const router = useRouter();
  const {
    isOrderModalOpen,
    setOrderFormModalOpen,
    products,
    setProducts,
    lookupCustomers,
  } = useUIStore();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(OrderSchema),
    defaultValues: {
      customerId: 0,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      items: [
        {
          productId: -1,
          quantity: 1,
        },
      ],
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const getData = async () => {
    const productsRes = await getProductsAction();
    if (productsRes.success) {
      setProducts(productsRes.data);
      if (
        productsRes.data.length > 0 &&
        fields.length > 0 &&
        fields[0].productId === -1
      ) {
        setValue("items.0.productId", productsRes.data[0].productId);
        setValue("items.0.unitPrice", Number(productsRes.data[0].unitPrice));
      }
    }
  };

  useEffect(() => {
    if (isOrderModalOpen) {
      getData();
    }
  }, [isOrderModalOpen]);

  if (!isOrderModalOpen) return null;

  const watchFields = useWatch({
    control,
    name: "items",
  });

  const watchCustomerId = useWatch({
    control,
    name: "customerId",
  });

  const customer = lookupCustomers.find(
    (c) => c.customerId === watchCustomerId,
  );

  const calculateTotal = () => {
    return (watchFields || []).reduce((sum, item) => {
      const sp = customer?.specialPricings?.find(
        (p: any) => Number(p.productId) === Number(item?.productId),
      );
      const discount = sp
        ? Number(sp.discountAmount)
        : Number(item?.discount || 0);
      const effectivePrice = Math.max(0, (item?.unitPrice ?? 0) - discount);
      return sum + (item?.quantity ?? 1) * effectivePrice;
    }, 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    startTransition(async () => {
      try {
        const res = await createOrderAction(data);
        if (!res.success) {
          throw new Error(res.error);
        }
        toast.add({
          title: "Order Created",
        });
        setOrderFormModalOpen(false);
        router.refresh();
      } catch (error: any) {
        toast.add({
          type: "error",
          priority: "high",
          description: error.message || "Failed to set special pricing",
        });
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-2 items-center">
          <ShoppingBag className="w-5 h-5" />
          Create Order
        </DialogTitle>
        <DialogDescription>Place a new water refill order</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup className="gap-2">
          <Controller
            name="customerId"
            control={control}
            rules={{ required: "Customer selection is required" }}
            render={({ field }) => (
              <Field data-invalid={!!errors.customerId?.message}>
                <FieldLabel>Customer</FieldLabel>
                <OrderCustomerLookupButton form={form}>
                  <FieldLabel className="w-full cursor-pointer justify-start">
                    {customer?.name || (
                      <div
                        className={cx("flex justify-start gap-2 items-center")}
                      >
                        <Search /> Select customer...
                      </div>
                    )}
                  </FieldLabel>
                </OrderCustomerLookupButton>
              </Field>
            )}
          />

          {customer &&
            customer.equipmentBalances &&
            customer.equipmentBalances.some(
              (b: any) =>
                (b.quantityOwed ?? 0) > 0 || (b.quantityTemporaryOwed ?? 0) > 0,
            ) && (
              <div className="flex flex-wrap gap-1.5">
                {customer.equipmentBalances
                  .filter(
                    (b: any) =>
                      (b.quantityOwed ?? 0) > 0 ||
                      (b.quantityTemporaryOwed ?? 0) > 0,
                  )
                  .map((b: any) => (
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

        <div>
          <div className="flex justify-between items-center mb-2">
            <FieldLabel>Order Items</FieldLabel>
          </div>

          <div className="space-y-3">
            {fields.map((fieldItem, idx) => {
              const currentProductId = watchFields?.[idx]?.productId;
              const specialPricing = customer?.specialPricings?.find(
                (sp: any) => Number(sp.productId) === Number(currentProductId),
              );

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
                              {...field}
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);

                                form.setValue(
                                  `items.${idx}.unitPrice`,
                                  products.find(
                                    (p: ProductInventory) =>
                                      p.productId === value,
                                  )?.unitPrice || 0,
                                );
                              }}
                            >
                              <SelectTrigger
                                aria-invalid={
                                  !!errors.items?.[idx]?.productId?.message
                                }
                                className="w-full"
                              >
                                <SelectValue placeholder="Select product...">
                                  {(val) =>
                                    products.find(
                                      (p: ProductInventory) =>
                                        String(p.productId) === String(val),
                                    )?.name
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {products
                                  .filter((i) => !i.isLendOnly)
                                  .filter((p: ProductInventory) => {
                                    const usedProductIds = (watchFields || [])
                                      .filter((_, i) => i !== idx)
                                      .map((item: any) =>
                                        Number(item?.productId),
                                      );
                                    return (
                                      p.productId === Number(field.value) ||
                                      !usedProductIds.includes(
                                        Number(p.productId),
                                      )
                                    );
                                  })
                                  .map((p: ProductInventory) => (
                                    <SelectItem
                                      key={p.productId}
                                      value={p.productId}
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
                        rules={{ min: 1 }}
                        render={({ field }) => (
                          <Field className="w-1/4">
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              aria-invalid={
                                !!errors.items?.[idx]?.quantity?.message
                              }
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                            <FieldError>
                              {errors.items?.[idx]?.quantity?.message}
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

                  {specialPricing &&
                    Number(specialPricing.discountAmount) > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-800/60">
                        <Tag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>
                          Special Discount: -
                          {formatCurrency(specialPricing.discountAmount)} / unit
                        </span>
                        <span className="text-muted-foreground text-[11px] ml-auto">
                          (Net:{" "}
                          {formatCurrency(
                            Math.max(
                              0,
                              (watchFields?.[idx]?.unitPrice ?? 0) -
                                Number(specialPricing.discountAmount),
                            ),
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
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-muted-foreground">Total Amount:</span>
          <span className="text-lg font-bold font-mono text-primary">
            {formatCurrency(calculateTotal())}
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
            {isPending ? "Placing Order..." : "Create Order"}
          </Button>
        </div>
      </form>
    </>
  );
};

export function OrderFormModal() {
  const { isOrderModalOpen, setOrderFormModalOpen } = useUIStore();

  if (!isOrderModalOpen) return null;

  return (
    <Modal
      isOpen={isOrderModalOpen}
      onClose={() => setOrderFormModalOpen(false)}
    >
      <OrderFormModalContent />
    </Modal>
  );
}
