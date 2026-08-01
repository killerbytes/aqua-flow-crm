"use client";

import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/backend/actions";
import { Customer } from "@/backend/models";
import { CustomerSchema } from "@/backend/schemas/zodSchemas";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { CustomerType } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash, UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type CustomerFormData = z.infer<typeof CustomerSchema>;

export function CustomerFormModal({
  barangays,
}: {
  barangays: readonly Barangay[];
}) {
  const { isCustomerFormModalOpen, setCustomerFormModalOpen, editingCustomer } =
    useUIStore();

  if (!isCustomerFormModalOpen) return null;

  return (
    <Modal
      isOpen={isCustomerFormModalOpen}
      onClose={() => setCustomerFormModalOpen(false, null)}
    >
      <CustomerFormModalContent
        editingCustomer={editingCustomer}
        barangays={barangays}
      />
    </Modal>
  );
}

function CustomerFormModalContent({
  editingCustomer,
  barangays,
}: {
  editingCustomer?: Customer;
  barangays: readonly Barangay[];
}) {
  const { setCustomerFormModalOpen } = useUIStore();

  const router = useRouter();
  const isEditing = editingCustomer;
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: editingCustomer?.name || "",
      address: editingCustomer?.address || "",
      phone: editingCustomer?.phone || "",
      notes: editingCustomer?.notes || "",
      customerType: editingCustomer?.customerType || CustomerType.RESIDENTIAL,
      barangayId: editingCustomer?.barangayId || "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const targetId = editingCustomer?.customerId;

      if (isEditing && targetId) {
        await updateCustomerAction(targetId, data);
        toast.add({
          title: "Customer Updated",
        });
      } else {
        await createCustomerAction(data);
        toast.add({
          title: "Customer Created",
        });
      }

      reset();
      setCustomerFormModalOpen(false, null);
      router.refresh();
    } catch (err: any) {
      toast.add({
        title: "Error",
        description:
          err.message ||
          `Failed to ${isEditing ? "update" : "create"} customer`,
      });
    }
  };

  const onDelete = async () => {
    try {
      if (isEditing && editingCustomer.customerId) {
        await deleteCustomerAction(editingCustomer.customerId);
        toast.add({
          title: "Customer Deleted",
        });
      }
      reset();
      setCustomerFormModalOpen(false, null);
      router.replace("/customers");
    } catch (err: any) {
      toast.add({
        title: "Error",
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
          {isEditing
            ? `Update profile details for ${editingCustomer?.name}`
            : "Add a new customer to AquaFlow CRM"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <Input placeholder="e.g. +63 917 123 4567" {...field} />
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

        {/* <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Customer Category
          </label>
          <Select
            {...register("customerType")}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {CUSTOMER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div> */}

        <DialogFooter>
          <Button
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
            onClick={() => setCustomerFormModalOpen(false, null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
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
