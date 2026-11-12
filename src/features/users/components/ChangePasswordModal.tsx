"use client";

import { changePasswordAction } from "@/backend/actions";
import {
  ChangePasswordData,
  ChangePasswordSchema,
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
import { toast } from "@/components/ui/toast";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

const ChangePasswordModalContent = () => {
  const router = useRouter();
  const { isChangePasswordModalOpen, editingUser, setChangePasswordModalOpen } =
    useUIStore();
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ChangePasswordSchema),
    values: React.useMemo(
      () => ({
        password: "",
        confirmPassword: "",
      }),
      [editingUser],
    ),
  });

  if (!isChangePasswordModalOpen) return null;

  const onSubmit = async (data: ChangePasswordData) => {
    try {
      startTransition(async () => {
        if (editingUser?.userId) {
          const res = await changePasswordAction(editingUser.userId, data);
          if (!res.success) {
            throw new Error(res.error);
          }
          toast.add({
            title: "Password updated successfully",
          });
        }

        reset();
        setChangePasswordModalOpen(false, null);
        router.refresh();
      });
    } catch (err: any) {
      toast.add({
        type: "error",
        priority: "high",
        title: err.message || "Failed to change password",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-2 font-semibold text-primary items-center">
          <UserCog className="w-5 h-5" />
          Change Password
        </DialogTitle>
        <DialogDescription>
          Update password for {editingUser?.name}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setChangePasswordModalOpen(false, null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Update
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};

export function ChangePasswordModal() {
  const { isChangePasswordModalOpen, setChangePasswordModalOpen } =
    useUIStore();

  if (!isChangePasswordModalOpen) return null;

  return (
    <Modal
      isOpen={isChangePasswordModalOpen}
      onClose={() => setChangePasswordModalOpen(false, null)}
    >
      <ChangePasswordModalContent />
    </Modal>
  );
}
