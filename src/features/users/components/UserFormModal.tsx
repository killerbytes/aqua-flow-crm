"use client";

import { createUserAction } from "@/backend/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRole } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { UserCog, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

export const UserFormModal: React.FC<{ onSuccess?: () => void }> = ({
  onSuccess,
}) => {
  const router = useRouter();
  const { isUserModalOpen, editingUser, setUserModalOpen, addToast } =
    useUIStore();
  const isEditing = Boolean(editingUser?.userId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: UserRole.STAFF,
    },
  });

  useEffect(() => {
    if (editingUser) {
      reset({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "",
        role: editingUser.role || UserRole.STAFF,
      });
    } else {
      reset({
        name: "",
        email: "",
        password: "",
        role: UserRole.STAFF,
      });
    }
  }, [editingUser, isUserModalOpen, reset]);

  if (!isUserModalOpen) return null;

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && editingUser?.userId) {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
                updateUser(id: $id, input: $input) {
                  user_id
                  name
                  role
                }
              }
            `,
            variables: { id: String(editingUser.userId), input: data },
          }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0].message);
        addToast("success", `User "${data.name}" updated successfully!`);
      } else {
        await createUserAction(data);
      }

      reset();
      setUserModalOpen(false, null);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast("error", err.message || "Failed to save user account");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-card glass-modal p-6 relative">
        <button
          onClick={() => setUserModalOpen(false, null)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            {isEditing ? (
              <UserCog className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {isEditing ? "Edit User Account" : "Add Staff Account"}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? `Update role & access for ${editingUser?.name}`
                : "Create a new user profile"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            placeholder="e.g. Alex Morgan"
            {...register("name", { required: true })}
          />
          <Input
            type="email"
            placeholder="alex@aquaflow.com"
            {...register("email", { required: true })}
          />
          {!isEditing && (
            <Input
              type="password"
              placeholder="••••••••"
              {...register("password", { required: true })}
            />
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Assign RBAC Role
            </label>
            <select
              {...register("role")}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUserModalOpen(false, null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update User"
                  : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
