"use client";

import { useAuthStore } from "@/lib/store";
import {
  Droplet,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarUI,
} from "../ui/sidebar";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  if (pathname === "/login") return null;

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

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Tag },
    { name: "Inventory", href: "/inventory", icon: Package },
  ];

  if (user?.role === "Admin") {
    navItems.push({ name: "Reports", href: "/reports", icon: FileText });
    navItems.push({ name: "Users", href: "/users", icon: UserCog });
  }

  return (
    <SidebarUI variant="inset">
      <SidebarHeader className="items-center">
        <Droplet className="h-8 w-8 text-primary animate-pulse" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary tracking-tight">
            Crystal Clear
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-accent-foreground  text-[10px] font-semibold tracking-wider">
            CRM SYSTEM
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      {item.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex justify-between items-center">
              <div className="flex">
                <p className="text-sm font-semibold">
                  {user?.username || "User"}
                </p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-foreground">
                  {user?.role || "Guest"}
                </span>
              </div>
              <Button onClick={handleLogout} size="icon">
                <LogOut size={16} />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  );
}
