"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    role: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      logout();
      router.push("/login");
    }
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex gap-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
          <Avatar className="h-8 w-8 rounded-lg grayscale">
            <AvatarFallback className="rounded-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.role}
            </span>
          </div>
          <Button variant="outline" onClick={handleLogout} size="icon">
            <LogOut size={16} />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
