import { requirePageUser } from "@/backend/auth/context";
import { initDatabase } from "@/backend/db/database";
import { AuthService } from "@/backend/services";
import PageHeader from "@/components/shared/PageHeader";
import { ChangePasswordModal } from "@/features/users/components/ChangePasswordModal";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import UserList from "@/features/users/components/UserList";
import { UserListActions } from "@/features/users/components/UserListActions";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await initDatabase();
  await requirePageUser();

  let users: any[] = [];
  try {
    users = await AuthService.getUsers();
  } catch (err) {
    users = [];
  }

  return (
    <div className="space-y-6">
      <div className="md:flex justify-between items-center space-y-4">
        <div>
          <PageHeader>
            <Users />
            User & RBAC Administration
          </PageHeader>
          <p className="text-muted-foreground">
            Manage staff user accounts, role permissions, and access privileges.
          </p>
        </div>

        <UserListActions />
      </div>

      <UserList users={users} />
      <UserFormModal />
      <ChangePasswordModal />
    </div>
  );
}
