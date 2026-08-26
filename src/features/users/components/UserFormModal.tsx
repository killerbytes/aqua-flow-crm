"use client";

import { createUserAction, updateUserAction } from "@/backend/actions";
import {
  UserFormData,
  UserFormSchema,
  UserFormUpdateSchema,
} from "@/backend/schemas/zodSchemas";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
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
  const { isUserModalOpen, editingUser, setUserModalOpen } = useUIStore();
  const isEditing = Boolean(editingUser?.userId);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(
      isEditing ? UserFormUpdateSchema : UserFormSchema,
    ) as any,
    values: React.useMemo(
      () => ({
        name: editingUser?.name || "",
        username: editingUser?.username || "",
        password: "",
        confirmPassword: "",
        role: editingUser?.role || UserRole.CASHIER,
        isActive: editingUser?.isActive ?? true,
      }),
      [editingUser],
    ),
  });

  if (!isUserModalOpen) return null;

  const onSubmit = async (data: UserFormData) => {
    try {
      startTransition(async () => {
        if (isEditing && editingUser?.userId) {
          const res = await updateUserAction(String(editingUser.userId), data);
          if (!res.success) {
            throw new Error(res.error);
          }
          toast.add({
            title: "User updated successfully",
          });
        } else {
          const res = await createUserAction(data);
          if (!res.success) {
            throw new Error(res.error);
          }
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
        type: "error",
        priority: "high",
        title: err.message || "Failed to save user account",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-semibold text-primary items-center flex flex-row gap-2">
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
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
            )}
          ></Controller>
        </FieldGroup>
        <FieldGroup>
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Username</FieldLabel>

                <Input placeholder="e.g. alex_morgan" {...field} />
                <FieldError>{errors.username?.message}</FieldError>
              </Field>
            )}
          ></Controller>
        </FieldGroup>
        {!isEditing && (
          <>
            <FieldGroup>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Password</FieldLabel>

                    <Input placeholder="e.g. *********" {...field} />
                    <FieldError>{errors.password?.message}</FieldError>
                  </Field>
                )}
              ></Controller>
            </FieldGroup>
            <FieldGroup>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Confirm Password</FieldLabel>

                    <Input placeholder="e.g. *********" {...field} />
                    <FieldError>{errors.confirmPassword?.message}</FieldError>
                  </Field>
                )}
              ></Controller>
            </FieldGroup>
          </>
        )}

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
                <FieldError>{errors.role?.message}</FieldError>
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
                <FieldError>{errors.isActive?.message}</FieldError>
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
