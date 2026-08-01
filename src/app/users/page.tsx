import React from "react";
import { initDatabase } from "@/backend/db/database";
import { User } from "@/backend/models";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import { UserListActions } from "@/features/users/components/UserListActions";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Mail, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await initDatabase();

  let users: any[] = [];
  try {
    users = await User.findAll({ order: [["createdAt", "DESC"]] });
  } catch (err) {
    users = [];
  }

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "danger";
      case "MANAGER":
        return "info";
      case "STAFF":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border border-cyan-500/20">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            User & RBAC Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage staff user accounts, role permissions, and access privileges.
          </p>
        </div>
        <UserListActions />
      </div>

      <div className="glass-card overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">User ID</th>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Assigned RBAC Role</th>
                <th className="p-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No user accounts recorded.
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.user_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-cyan-400">
                      #USR-{u.user_id}
                    </td>
                    <td className="p-4 font-semibold text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      {u.name}
                    </td>
                    <td className="p-4 text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {u.email}
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleVariant(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal />
    </div>
  );
}
