"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EquipmentLogSchema } from "@/backend/schemas/zodSchemas";
import { EQUIPMENT_ACTION_OPTIONS, EquipmentActionType } from "@/lib/definitions";
import { useUIStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, PackageCheck } from "lucide-react";
import { z } from "zod";

type EquipmentLogFormData = z.infer<typeof EquipmentLogSchema>;

export const LogEquipmentModal: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const router = useRouter();
  const { isEquipmentLogModalOpen, setEquipmentLogModalOpen, selectedCustomerId, addToast } = useUIStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentLogFormData>({
    resolver: zodResolver(EquipmentLogSchema),
    defaultValues: {
      customerId: selectedCustomerId || 1,
      productId: 1,
      actionType: EquipmentActionType.ISSUE,
      quantity: 1,
      notes: "",
    },
  });

  if (!isEquipmentLogModalOpen) return null;

  const onSubmit = async (data: EquipmentLogFormData) => {
    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation LogEquipment($input: LogEquipmentInput!) {
              logEquipment(input: $input) {
                logId
                actionType
                quantity
              }
            }
          `,
          variables: { input: data },
        }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);

      addToast("success", `Equipment log recorded successfully!`);
      reset();
      setEquipmentLogModalOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast("error", err.message || "Failed to log equipment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-card glass-modal p-6 relative">
        <button
          onClick={() => setEquipmentLogModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Log Equipment Action</h2>
            <p className="text-xs text-slate-400">Record container issues, returns, or adjustments</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Customer ID"
            type="number"
            {...register("customerId", { valueAsNumber: true })}
            error={errors.customerId?.message}
          />

          <Input
            label="Product Container ID"
            type="number"
            {...register("productId", { valueAsNumber: true })}
            error={errors.productId?.message}
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Action Type</label>
            <select
              {...register("actionType")}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {EQUIPMENT_ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity"
            type="number"
            {...register("quantity", { valueAsNumber: true })}
            error={errors.quantity?.message}
          />

          <Input
            label="Notes / Remarks"
            placeholder="e.g. Returned 5 slim 5-gallon containers"
            {...register("notes")}
            error={errors.notes?.message}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEquipmentLogModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging..." : "Record Log"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
