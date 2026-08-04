import { initDatabase } from "@/backend/db/database";
import { AuthService } from "@/backend/services";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import UserList from "@/features/users/components/UserList";
import { UserListActions } from "@/features/users/components/UserListActions";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await initDatabase();

  let users: any[] = [];
  try {
    users = await AuthService.getUsers();
  } catch (err) {
    users = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users />
            User & RBAC Administration
          </h1>
          <p className="text-muted-foreground">
            Manage staff user accounts, role permissions, and access privileges.
          </p>
        </div>

        <UserListActions />
      </div>

      <UserList users={users} />
      <UserFormModal />
    </div>
  );
}
