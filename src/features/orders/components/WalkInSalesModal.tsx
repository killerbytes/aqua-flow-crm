"use client";

import {
  createOrderAction,
  getProductsAction,
  getWalkInCustomerAction,
} from "@/backend/actions";
import { ProductInventory } from "@/backend/models";
import { OrderFormData, OrderSchema } from "@/backend/schemas/zodSchemas";
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
import { toast } from "@/components/ui/toast";
import { OrderStatus, PaymentStatus } from "@/lib/definitions";
import { formatCurrency } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Plus, Store, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

export const WalkInSalesModalContent = () => {
  const router = useRouter();
  const { isWalkInModalOpen, setWalkInModalOpen, products, setProducts } =
    useUIStore();
  const [isPending, startTransition] = useTransition();
  const [walkInCustomerId, setWalkInCustomerId] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(OrderSchema),
    defaultValues: {
      customerId: 0,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      createdAt: new Date().toISOString().split("T")[0],
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
    reset,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const getData = async () => {
    const [productsRes, walkInRes] = await Promise.all([
      getProductsAction(),
      getWalkInCustomerAction(),
    ]);

    if (productsRes.success && productsRes.data) {
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

    if (walkInRes.success && walkInRes.data) {
      setWalkInCustomerId(walkInRes.data.customerId);
      setValue("customerId", walkInRes.data.customerId);
    }
  };

  useEffect(() => {
    if (isWalkInModalOpen) {
      getData();
    }
  }, [isWalkInModalOpen]);

  if (!isWalkInModalOpen) return null;

  const watchFields = useWatch({
    control,
    name: "items",
  });

  const calculateTotal = () => {
    return (watchFields || []).reduce(
      (sum, item) => sum + (item?.quantity || 0) * (item?.unitPrice ?? 0),
      0,
    );
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!walkInCustomerId) {
      toast.add({
        type: "error",
        title: "Walk-in customer account not loaded yet",
      });
      return;
    }

    startTransition(async () => {
      try {
        const payload: OrderFormData = {
          ...data,
          customerId: walkInCustomerId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
        };

        const res = await createOrderAction(payload);
        if (!res.success) {
          throw new Error(res.error);
        }

        toast.add({
          type: "success",
          title: "Consolidated Walk-In sales recorded successfully",
        });

        setWalkInModalOpen(false);
        reset();
        router.refresh();
      } catch (err: any) {
        toast.add({
          type: "error",
          priority: "high",
          title: err.message || "Failed to record walk-in sales",
        });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <FieldGroup>
          <Controller
            name="createdAt"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="flex items-center gap-1">
                  <Calendar size={14} /> Sale Date
                </FieldLabel>
                <Input
                  type="date"
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                />
                <FieldError>{errors.createdAt?.message}</FieldError>
              </Field>
            )}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <FieldLabel>Order Items</FieldLabel>
            </div>

            <div className="space-y-3">
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex gap-3 items-center">
                  <FieldGroup className="flex flex-row gap-2">
                    <Controller
                      name={`items.${index}.productId`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => {
                            const pid = Number(val);
                            field.onChange(pid);
                            const found = products.find(
                              (p) => p.productId === pid,
                            );
                            if (found) {
                              setValue(
                                `items.${index}.unitPrice`,
                                Number(found.unitPrice),
                              );
                            }
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
                                  .filter((_, i) => i !== index)
                                  .map((item: any) => Number(item?.productId));
                                return (
                                  p.productId === Number(field.value) ||
                                  !usedProductIds.includes(Number(p.productId))
                                );
                              })
                              .map((p) => (
                                <SelectItem
                                  key={p.productId}
                                  value={String(p.productId)}
                                >
                                  {p.name} (
                                  {formatCurrency(Number(p.unitPrice))})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Controller
                      name={`items.${index}.quantity`}
                      control={control}
                      render={({ field }) => (
                        <Field className="w-1/4">
                          <Input
                            type="number"
                            min={1}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </Field>
                      )}
                    />

                    {fields.length > 1 && (
                      <Button
                        size="icon"
                        variant="outline"
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </FieldGroup>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 text-xs flex items-center gap-1"
              onClick={() =>
                append({
                  productId: -1,
                  quantity: 1,
                  unitPrice: 0,
                  discount: 0,
                })
              }
            >
              <Plus size={14} /> Add Item
            </Button>
          </div>
        </FieldGroup>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-muted-foreground font-medium">
            Total Daily Revenue:
          </span>
          <span className="text-2xl font-bold text-green-500">
            {formatCurrency(calculateTotal())}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWalkInModalOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isPending ? "Recording..." : "Record Daily Walk-In Sales"}
          </Button>
        </div>
      </form>
    </>
  );
};

export const WalkInSalesModal = () => {
  const { isWalkInModalOpen, setWalkInModalOpen } = useUIStore();
  if (!isWalkInModalOpen) return null;

  return (
    <Modal
      title={
        <>
          <Store />
          Consolidated Daily Walk-In Sales
        </>
      }
      description="Record over-the-counter daily cash sales for walk-in customers."
      isOpen={isWalkInModalOpen}
      onClose={() => setWalkInModalOpen(false)}
    >
      <WalkInSalesModalContent />
    </Modal>
  );
};
