"use client";

import { createUserAction, updateUserAction } from "@/backend/actions";
import { UserFormData, UserFormSchema } from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCog, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

export function UserFormModal() {
  const { isUserModalOpen, setUserModalOpen } = useUIStore();

  if (!isUserModalOpen) return null;

  return (
    <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)}>
      <OrderFormModalContent />
    </Modal>
  );
}

export const OrderFormModalContent = () => {
  const router = useRouter();
  const { isUserModalOpen, editingUser, setUserModalOpen, addToast } =
    useUIStore();
  const isEditing = Boolean(editingUser?.userId);
  const [isPending, startTransition] = useTransition();
  console.log(editingUser);

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(UserFormSchema),
    values: React.useMemo(
      () => ({
        name: editingUser?.name || "",
        username: editingUser?.username || "",
        password: "",
        role: editingUser?.role || UserRole.CASHIER,
        isActive: editingUser?.isActive,
      }),
      [editingUser],
    ),
  });
  console.log(errors);

  if (!isUserModalOpen) return null;

  const onSubmit = async (data: UserFormData) => {
    console.log(123, data);

    try {
      startTransition(async () => {
        if (isEditing && editingUser?.userId) {
          await updateUserAction(String(editingUser.userId), data);
          toast.add({
            title: "User updated successfully",
          });
        } else {
          await createUserAction(data);
          toast.add({
            title: "User created successfully",
          });
        }

        reset();
        setUserModalOpen(false, null);
        router.refresh();
      });
    } catch (err: any) {
      toast.add({
        title: err.message || "Failed to save user account",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3">
          {isEditing ? (
            <UserCog className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          {isEditing ? "Edit User Account" : "Add Staff Account"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? `Update role & access for ${editingUser?.name}`
            : "Create a new user profile"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Full Name</FieldLabel>

                <Input placeholder="e.g. Alex Morgan" {...field} />
              </Field>
            )}
          ></Controller>
        </FieldGroup>
        <FieldGroup>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Role</FieldLabel>

                <Select
                  {...field}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          ></Controller>
        </FieldGroup>
        <FieldGroup>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Active Status</FieldLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          ></Controller>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setUserModalOpen(false, null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Update User"
                : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};
