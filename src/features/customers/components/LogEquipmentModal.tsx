"use client";

import { logEquipmentAction } from "@/backend/actions";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { EquipmentActionType } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
export interface LogEquipmentFormData {
  customer_id: string;
  product_id: string;
  action_type: string;
  quantity: number;
  notes?: string;
}

interface LogEquipmentModalProps {
  onClose: () => void;
  customer: Customer;
  products: Product[];
}

export function LogEquipmentModal({
  onClose,
  customer,
  products,
}: LogEquipmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<LogEquipmentFormData>({
    defaultValues: {
      customer_id: String(customer.customerId),
      product_id: "",
      action_type: EquipmentActionType.TEMPORARY,
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

  const handleSave = (data: LogEquipmentFormData) => {
    startTransition(async () => {
      const result = await logEquipmentAction({
        customer_id: data.customer_id,
        product_id: data.product_id,
        action_type: data.action_type,
        quantity: Number(data.quantity),
        notes: data.notes,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            setError(field as keyof LogEquipmentFormData, {
              message: messages[0],
            });
          });
        }
        toast.add({
          type: "error",
          description: result.message,
        });
        return;
      }

      toast.add({
        type: "success",
        description: "Equipment transaction logged",
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Log Equipment"
      description="Track containers borrowed, returned, or lost by customers."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <FieldGroup>
          <Controller
            name="product_id"
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
                          (p: Product) => String(p.productId) === String(val),
                        )?.name ?? val
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: Product) => (
                      <SelectItem key={p.productId} value={String(p.productId)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.product_id?.message}</FieldError>
              </Field>
            )}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup>
            <Controller
              name="action_type"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Action Type</FieldLabel>
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EquipmentActionType).map((actionType) => (
                        <SelectItem key={actionType} value={actionType}>
                          {actionType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup>
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
          </FieldGroup>
        </div>

        <FieldGroup>
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
        </FieldGroup>

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

export default LogEquipmentModal;
