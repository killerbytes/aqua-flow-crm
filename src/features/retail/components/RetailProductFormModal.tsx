"use client";

import {
  createRetailProductAction,
  updateRetailProductAction,
} from "@/backend/actions";
import {
  RetailProductFormData,
  RetailProductSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackagePlus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

function RetailProductFormModalContent() {
  const router = useRouter();
  const { setRetailProductModalOpen, editingRetailProduct: product } =
    useUIStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RetailProductFormData>({
    resolver: zodResolver(RetailProductSchema),
    defaultValues: {
      name: product?.name ?? "",
      basePrice: product?.basePrice ?? 0,
      lowStockThreshold: product?.lowStockThreshold ?? null,
    },
  });

  const close = () => setRetailProductModalOpen(false, null);

  const onSubmit = async (data: RetailProductFormData) => {
    const payload = {
      name: data.name,
      basePrice: Number(data.basePrice),
      lowStockThreshold: data.lowStockThreshold ?? null,
    };
    const res = product
      ? await updateRetailProductAction(product.productId, payload)
      : await createRetailProductAction(payload);

    if (!res.success) {
      toast.add({
        type: "error",
        priority: "high",
        title: `Failed to save product: ${res.error}`,
      });
      return;
    }
    toast.add({
      type: "success",
      title: product ? "Product updated" : "Product added",
    });
    close();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldSet>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Field>
              <FieldLabel>Product Name</FieldLabel>
              <Input
                placeholder="e.g. Brand-new 5-Gallon Container (Round)"
                {...field}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="basePrice"
          render={({ field }) => (
            <Field>
              <FieldLabel>Base Price</FieldLabel>
              <Input type="number" min={0} step="0.01" {...field} />
              <FieldDescription>
                What one unit sells for. A discount can be taken off the whole
                bill when it is paid.
              </FieldDescription>
              <FieldError>{errors.basePrice?.message}</FieldError>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="lowStockThreshold"
          render={({ field }) => (
            <Field>
              <FieldLabel>Low Stock Warning</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Leave empty for no warning"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
              <FieldDescription>
                The dashboard warns when stock falls to this number or below.
              </FieldDescription>
              <FieldError>{errors.lowStockThreshold?.message}</FieldError>
            </Field>
          )}
        />
      </FieldSet>
      {!product && (
        <p className="text-xs text-muted-foreground">
          A new product starts with no stock. Restock it once it&apos;s added.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : product
              ? "Update Product"
              : "Add Product"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RetailProductFormModal() {
  const {
    isRetailProductModalOpen,
    setRetailProductModalOpen,
    editingRetailProduct,
  } = useUIStore();

  // The content mounts on open, so each form starts fresh.
  if (!isRetailProductModalOpen) return null;

  return (
    <Modal
      isOpen
      onClose={() => setRetailProductModalOpen(false, null)}
      title={
        <>
          {editingRetailProduct ? <Tag /> : <PackagePlus />}
          {editingRetailProduct ? "Edit Retail Product" : "Add Retail Product"}
        </>
      }
      description={
        editingRetailProduct
          ? `Update ${editingRetailProduct.name}. Past sales keep the price they were sold at.`
          : "A brand-new item to sell over the counter."
      }
    >
      <RetailProductFormModalContent />
    </Modal>
  );
}
