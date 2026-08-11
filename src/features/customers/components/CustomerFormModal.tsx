"use client";

import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/backend/actions";
import { CustomerFormData, CustomerSchema } from "@/backend/schemas/zodSchemas";
import { Barangay } from "@/backend/services/commonService";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, FieldSet } from "@/components/ui/field";
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
import { CustomerStatus } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash, UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

function CustomerFormModalContent({
  barangays,
}: {
  barangays: readonly Barangay[];
}) {
  const { setCustomerFormModalOpen, editingCustomer } = useUIStore();
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const isEditing = editingCustomer;
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerSchema),
    values: {
      name: editingCustomer?.name || "",
      address: editingCustomer?.address || "",
      phone: editingCustomer?.phone || "",
      notes: editingCustomer?.notes || "",
      barangayId: editingCustomer?.barangayId || "",
      status: editingCustomer?.status || CustomerStatus.ACTIVE,
    },
  });

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (data: CustomerFormData) => {
    const targetId = editingCustomer?.customerId;
    startTransition(async () => {
      try {
        if (isEditing && targetId) {
          const res = await updateCustomerAction(targetId, data);
          if (!res.success) {
            throw new Error(res.error);
          }
          toast.add({
            title: "Customer Updated",
          });
        } else {
          const res = await createCustomerAction(data);
          if (!res.success) {
            throw new Error(res.error);
          }
          toast.add({
            title: "Customer Created",
          });
          router.push("/customers/" + res.data.customerId);
        }

        reset();
        setCustomerFormModalOpen(false, null);
        router.refresh();
      } catch (err: any) {
        toast.add({
          type: "error",
          priority: "high",
          description:
            err.message ||
            `Failed to ${isEditing ? "update" : "create"} customer`,
        });
      }
    });
  };

  const onDelete = async () => {
    try {
      if (isEditing && editingCustomer.customerId) {
        const res = await deleteCustomerAction(editingCustomer.customerId);
        if (!res.success) {
          throw new Error(res.error);
        }
        toast.add({
          title: "Customer Deleted",
        });
      }
      reset();
      setCustomerFormModalOpen(false, null);
      router.replace("/customers");
    } catch (err: any) {
      toast.add({
        type: "error",
        priority: "high",
        description: err.message || `Failed to delete customer`,
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3">
          {isEditing ? (
            <UserCheck className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          {isEditing ? "Edit Customer Profile" : "Register New Customer"}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? (
            <div>
              Update profile details for{" "}
              <span className="font-bold text-accent-foreground">
                {editingCustomer?.name}
              </span>
            </div>
          ) : (
            "Add a new customer to AquaFlow CRM"
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="-mx-4 no-scrollbar space-y-4 max-h-[50vh] overflow-y-auto px-4">
          <FieldSet>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Full Name / Company Name</FieldLabel>
                  <Input placeholder="e.g. John Doe / Apex Inc." {...field} />
                  <FieldError>{errors.name?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
          <FieldSet>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Delivery Address</FieldLabel>
                  <Input
                    placeholder="e.g. 123 Palm Street, Suite 400"
                    {...field}
                  />
                  <FieldError>{errors.address?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
          <FieldSet>
            <Controller
              name="barangayId"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Barangay</FieldLabel>
                  <Input {...field} type="hidden" />
                  <Combobox
                    items={barangays}
                    value={
                      field.value
                        ? barangays.find((b) => b.code === field.value)
                        : null
                    }
                    onValueChange={(item) => {
                      field.onChange(item?.code || "");
                    }}
                    itemToStringLabel={(item: Barangay | null) =>
                      item?.name ?? ""
                    }
                    itemToStringValue={(item: Barangay | null) =>
                      item?.code ?? ""
                    }
                  >
                    <ComboboxInput placeholder="Select a barangay" />
                    <ComboboxContent>
                      <ComboboxEmpty>No barangay found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item.code} value={item}>
                            {item.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError>{errors.barangayId?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
          <FieldSet>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Contact Phone</FieldLabel>
                  <Input
                    placeholder="e.g. +63 917 123 4567"
                    {...field}
                    value={field.value || ""}
                  />
                  <FieldError>{errors.phone?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
          <FieldSet>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea
                    placeholder="e.g. Special delivery instructions"
                    {...field}
                  />
                  <FieldError>{errors.notes?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
          <FieldSet>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.values(CustomerStatus).map((pst) => (
                        <SelectItem key={pst} value={pst}>
                          {pst}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.status?.message}</FieldError>
                </Field>
              )}
            />
          </FieldSet>
        </div>
        <DialogFooter>
          {isEditing && (
            <Button
              variant="destructive"
              size="icon"
              className="mr-auto"
              onClick={onDelete}
            >
              <Trash />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCustomerFormModalOpen(false, null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : "Saving..."
              : isEditing
                ? "Update Customer"
                : "Create Customer"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function CustomerFormModal({
  barangays,
}: {
  barangays: readonly Barangay[];
}) {
  const { isCustomerFormModalOpen, setCustomerFormModalOpen } = useUIStore();

  if (!isCustomerFormModalOpen) return null;

  return (
    <Modal
      isOpen={isCustomerFormModalOpen}
      onClose={() => setCustomerFormModalOpen(false, null)}
    >
      <CustomerFormModalContent barangays={barangays} />
    </Modal>
  );
}
