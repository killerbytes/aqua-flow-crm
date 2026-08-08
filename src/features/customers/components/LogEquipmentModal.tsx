"use client";

import { logEquipmentAction } from "@/backend/actions";
import { ProductInventory } from "@/backend/models";
import {
  EquipmentLogFormData,
  EquipmentLogSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ActionType, TemporaryEquipmentActionType } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

interface LogEquipmentModalProps {
  onClose: () => void;
  products: ProductInventory[];
}

function LogEquipmentModalContent({
  onClose,
  products,
}: LogEquipmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isTemp, setIsTemp] = React.useState(false);
  const { selectedCustomerId, selectedProductId, setEquipmentLogModalOpen } =
    useUIStore();

  const form = useForm<EquipmentLogFormData>({
    resolver: zodResolver(EquipmentLogSchema),
    defaultValues: {
      customerId: Number(selectedCustomerId),
      productId: Number(selectedProductId || 0),
      actionType: undefined,
      quantity: 1,
      notes: "",
    },
  });

  const {
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = form;

  const handleSave = (data: EquipmentLogFormData) => {
    startTransition(async () => {
      try {
        await logEquipmentAction(data);

        toast.add({
          type: "success",
          description: "Equipment transaction logged",
        });
        onClose();
        router.refresh();
      } catch (error: any) {
        toast.add({
          type: "error",
          description: error.message || "Failed to log equipment",
        });
      }
    });
  };
  console.log(errors);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Log Equipment"
      description="Track containers borrowed, returned, or lost by customers."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <Field orientation="horizontal">
          <ToggleGroup
            variant="outline"
            size="sm"
            className="gap-0 grid grid-cols-2 w-full"
            value={isTemp ? ["temp"] : ["fixed"]}
            onValueChange={(value) => {
              setIsTemp(value.length > 0 && value[0] === "temp");
              form.setValue("actionType", "" as any);
            }}
          >
            <ToggleGroupItem
              className="rounded-r-none focus:z-10"
              value="fixed"
            >
              Fixed
            </ToggleGroupItem>
            <ToggleGroupItem className="rounded-l-none focus:z-10" value="temp">
              Temporary
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Controller
          name="productId"
          control={control}
          rules={{ required: "Product is required" }}
          render={({ field }) => (
            <Field>
              <FieldLabel>Equipment / Product</FieldLabel>
              <Select
                {...field}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product...">
                    {(val) =>
                      products.find(
                        (p: ProductInventory) =>
                          String(p.productId) === String(val),
                      )?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: ProductInventory) => (
                    <SelectItem key={p.productId} value={Number(p.productId)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.productId?.message}</FieldError>
            </Field>
          )}
        />

        <FieldSet className="grid grid-cols-2 gap-4">
          <Controller
            name="actionType"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Action Type</FieldLabel>
                <Select
                  key={`${isTemp ? "temp" : "std"}-${field.value ?? ""}`}
                  value={field.value ?? ""}
                  onValueChange={(val) => field.onChange(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""></SelectItem>

                    {Object.values(
                      isTemp ? TemporaryEquipmentActionType : ActionType,
                    ).map((actionType) => (
                      <SelectItem key={actionType} value={actionType}>
                        {actionType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.actionType?.message}</FieldError>
              </Field>
            )}
          />

          <Controller
            name="quantity"
            control={control}
            rules={{
              required: "Quantity is required",
              min: { value: 1, message: "Min quantity is 1" },
            }}
            render={({ field }) => (
              <Field>
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
                <FieldError>{errors.quantity?.message}</FieldError>
              </Field>
            )}
          />
        </FieldSet>
        <FieldGroup></FieldGroup>

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea placeholder="Additional notes..." {...field} />
              <FieldError>{errors.notes?.message}</FieldError>
            </Field>
          )}
        />

        <DialogFooter className="pt-4">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
            )}
            {isPending ? "Logging..." : "Save Record"}
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}

export function LogEquipmentModal({
  products,
}: {
  products: ProductInventory[];
}) {
  const { isEquipmentLogModalOpen, setEquipmentLogModalOpen } = useUIStore();

  if (!isEquipmentLogModalOpen) return null;

  return (
    <Modal
      isOpen={isEquipmentLogModalOpen}
      onClose={() => setEquipmentLogModalOpen(false, null)}
    >
      <LogEquipmentModalContent
        onClose={() => setEquipmentLogModalOpen(false, null)}
        products={products}
      />
    </Modal>
  );
}
