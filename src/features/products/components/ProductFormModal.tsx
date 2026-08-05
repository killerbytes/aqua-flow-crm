"use client";

import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/backend/actions";
import {
  ProductFormData,
  ProductInventorySchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackagePlus, Tag, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

export function ProductFormModal() {
  const { isProductModalOpen, setProductFormModalOpen } = useUIStore();

  if (!isProductModalOpen) return null;

  return (
    <Modal isOpen onClose={() => setProductFormModalOpen(false, null)}>
      <ProductFormModalContent />
    </Modal>
  );
}

export const ProductFormModalContent = ({}) => {
  const router = useRouter();
  const { isProductModalOpen, setProductFormModalOpen, editingProduct } =
    useUIStore();
  const isEditing = Boolean(editingProduct?.productId);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductInventorySchema),
    defaultValues: {
      name: editingProduct?.name || "",
      unitPrice: editingProduct?.unitPrice || 0,
      isDefault: editingProduct?.isDefault || false,
      isLendOnly: editingProduct?.isLendOnly || false,
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  if (!isProductModalOpen) return null;

  const onSubmit = async (data: ProductFormData) => {
    try {
      const payload = {
        name: data.name,
        unitPrice: Number(data.unitPrice),
        isDefault: data.isDefault,
        isLendOnly: data.isLendOnly,
      };

      const targetId = editingProduct?.productId;
      if (isEditing && targetId) {
        await updateProductAction(targetId, payload);
        toast.add({
          type: "success",
          title: "Product updated successfully!",
        });
      } else {
        await createProductAction(payload);
        toast.add({
          type: "success",
          title: "Product added successfully!",
        });
      }

      reset();
      setProductFormModalOpen(false, null);
      router.refresh();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: `Failed to save product: ${err.message}`,
      });
    }
  };

  const onDelete = async () => {
    try {
      const targetId = editingProduct?.productId;
      if (isEditing && targetId) {
        await deleteProductAction(targetId);
        toast.add({
          type: "success",
          title: "Product deleted successfully!",
        });
        reset();
        setProductFormModalOpen(false, null);
        router.refresh();
      }
    } catch (err: any) {
      toast.add({
        type: "error",
        title: `Product deletion failed! ${err.message}`,
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          {isEditing ? (
            <Tag className="w-5 h-5" />
          ) : (
            <PackagePlus className="w-5 h-5" />
          )}
          {isEditing ? "Edit Product Item" : "Add Catalog Product"}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {isEditing
            ? `Update details for ${editingProduct?.name}`
            : "Create a new product item"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldSet>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Field>
                <FieldLabel>Product Name</FieldLabel>
                <Input placeholder="e.g. 5-Gallon Alkaline Water" {...field} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>

        <FieldSet>
          <Controller
            control={control}
            name="unitPrice"
            render={({ field }) => (
              <Field>
                <FieldLabel>Unit Price</FieldLabel>
                <Input type="number" placeholder="50.00" {...field} />
                <FieldError>{errors.unitPrice?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>

        <FieldSet>
          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => (
              <Field>
                <FieldLabel>Is Default</FieldLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                  }}
                />
                <FieldError>{errors.isDefault?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>
        <FieldSet>
          <Controller
            control={control}
            name="isLendOnly"
            render={({ field }) => (
              <Field>
                <FieldLabel>Is Lend Only</FieldLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                  }}
                />
                <FieldError>{errors.isLendOnly?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="mr-auto"
            onClick={onDelete}
          >
            <Trash />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setProductFormModalOpen(false, null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Product"
                : "Save Product"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};
