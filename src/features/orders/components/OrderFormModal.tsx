"use client";

import {
  createOrderAction,
  getCustomersAction,
  getProductsAction,
} from "@/backend/actions";
import { ProductInventory } from "@/backend/models";
import { OrderSchema } from "@/backend/schemas/zodSchemas";
import CustomerLookup from "@/components/CustomerLookup";
import Modal from "@/components/Modal";
import { Button, buttonVariants } from "@/components/ui/button";
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
  FieldSet,
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
import { Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import z from "zod";

type OrderFormData = z.infer<typeof OrderSchema>;

export function OrderFormModal() {
  const { isOrderModalOpen, setOrderModalOpen } = useUIStore();

  if (!isOrderModalOpen) return null;

  return (
    <Modal isOpen={isOrderModalOpen} onClose={() => setOrderModalOpen(false)}>
      <OrderFormModalContent />
    </Modal>
  );
}

export const OrderFormModalContent = () => {
  const router = useRouter();
  const {
    isOrderModalOpen,
    setOrderModalOpen,
    setCustomerLookupModalOpen,
    products,
    setProducts,
  } = useUIStore();
  const [customers, setCustomers] = useState<any[]>([]);
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
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const getData = async () => {
    const [customers, products] = await Promise.all([
      getCustomersAction(),
      getProductsAction(),
    ]);
    setCustomers(customers.rows);
    setProducts(products);
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

  const calculateTotal = () => {
    return watchFields.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
  };

  const onSubmit = async (data: OrderFormData) => {
    startTransition(async () => {
      await createOrderAction(data);
      toast.add({
        title: "Order Created",
      });
      setOrderModalOpen(false);
      router.refresh();
    });
  };
  console.log(errors);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3">
          <ShoppingBag className="w-5 h-5" />
          Create Order
        </DialogTitle>
        <DialogDescription>Place a new water container order</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <Controller
            name="customerId"
            control={control}
            rules={{ required: "Customer selection is required" }}
            render={({ field }) => (
              <Field>
                <FieldLabel>Customer</FieldLabel>
                <CustomerLookup
                  onSelect={(e) => {
                    form.setValue("customerId", Number(e));
                  }}
                >
                  <FieldLabel
                    onClick={() => setCustomerLookupModalOpen(true)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full cursor-pointer justify-start",
                    })}
                  >
                    {customers.find((c) => c.customerId === field.value)
                      ?.name || (
                      <div
                        className={cx("flex justify-start gap-2 items-center")}
                      >
                        <Search /> Select customer...
                      </div>
                    )}
                  </FieldLabel>
                  <FieldError>{errors.customerId?.message}</FieldError>
                </CustomerLookup>
              </Field>
            )}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldSet>
            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Payment Status</FieldLabel>
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.values(PaymentStatus).map((pst) => (
                        <SelectItem key={pst} value={pst}>
                          {pst}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FieldError>{errors.paymentStatus?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <FieldLabel>Order Items</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ productId: 0, quantity: 1, unitPrice: 0 })
              }
            >
              <Plus size={14} /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((fieldItem, idx) => (
              <div key={fieldItem.id} className="flex gap-3 items-center">
                <div className="flex-1">
                  <Controller
                    name={`items.${idx}.productId`}
                    control={control}
                    rules={{ required: "Product is required" }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);

                          form.setValue(
                            `items.${idx}.unitPrice`,
                            products.find(
                              (p: ProductInventory) => p.productId === value,
                            )?.unitPrice || 0,
                          );
                        }}
                      >
                        <SelectTrigger className="w-full">
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
                                .map((item: any) => Number(item?.productId));
                              return (
                                p.productId === Number(field.value) ||
                                !usedProductIds.includes(Number(p.productId))
                              );
                            })
                            .map((p: ProductInventory) => (
                              <SelectItem key={p.productId} value={p.productId}>
                                {p.name} ({formatCurrency(p.unitPrice)})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="w-28">
                  <Controller
                    name={`items.${idx}.quantity`}
                    control={control}
                    rules={{ min: 1 }}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
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
            onClick={() => setOrderModalOpen(false)}
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
