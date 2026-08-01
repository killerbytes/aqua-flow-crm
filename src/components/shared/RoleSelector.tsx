"use client";

import React from "react";
import { useUIStore } from "@/store/uiStore";
import { UserRole, USER_ROLE_OPTIONS } from "@/lib/definitions";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export const RoleSelector: React.FC = () => {
  const { currentRole, setRole } = useUIStore();

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 glass-card border border-cyan-500/20">
      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>RBAC Context:</span>
      </div>
      <select
        value={currentRole}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
      >
        {USER_ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} ({opt.value})
          </option>
        ))}
      </select>
    </div>
  );
};
