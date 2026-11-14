"use client";

import { checkPermission, PermissionAction } from "@/backend/rbac/permissions";
import { REPORTS } from "@/features/reports/definitions";
import { useAuthStore } from "@/lib/store";
import { cx } from "class-variance-authority";
import {
  Clock,
  FileChartColumn,
  LayoutDashboard,
  PackageOpen,
  Receipt,
  Search,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CustomerLookup from "../CustomerLookup";
import { CustomerLookupButton } from "../CustomerLookupButton";
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
  SidebarMenuSub,
  SidebarRail,
  Sidebar as SidebarUI,
  useSidebar,
} from "../ui/sidebar";
import { NavUser } from "./NavUser";
const REPORT_ICONS: Record<string, any> = {
  "inactive-customers": UserX,
  "inactive-with-equipment": PackageOpen,
  "temporary-equipment": Clock,
};

interface NavItem {
  name: string;
  href: string;
  icon: any;
  subMenu?: NavItem[];
}
export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  if (pathname === "/login") return null;

  const { open, setOpenMobile } = useSidebar();

  const can = (permission: PermissionAction) =>
    !!user && checkPermission(user.role, permission);

  const navItems: NavItem[] = [
    ...(can("VIEW_DASHBOARD")
      ? [{ name: "Dashboard", href: "/", icon: LayoutDashboard }]
      : []),
    ...(can("VIEW_CUSTOMERS")
      ? [{ name: "Customers", href: "/customers", icon: Users }]
      : []),
    ...(can("VIEW_ORDERS")
      ? [{ name: "Orders", href: "/orders", icon: ShoppingCart }]
      : []),
    ...(can("VIEW_PRODUCTS")
      ? [{ name: "Products", href: "/products", icon: Tag }]
      : []),
    ...(can("VIEW_INVOICES")
      ? [{ name: "Invoices", href: "/invoices", icon: Receipt }]
      : []),
    ...(can("VIEW_REPORTS")
      ? [
          {
            name: "Reports",
            href: "/reports",
            icon: FileChartColumn,
          },
        ]
      : []),
    ...(can("VIEW_USERS")
      ? [{ name: "Users", href: "/users", icon: UserCog }]
      : []),
  ];

  return (
    <SidebarUI variant="inset" className="print:hidden" collapsible="icon">
      <SidebarHeader className="items-center">
        <div className="flex w-full items-center justify-between gap-4">
          <Image
            src="/logo.jpg"
            alt={process.env.NEXT_PUBLIC_APP_NAME || ""}
            width={260}
            height={160}
            className={cx(open ? "" : "hidden")}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      className={cx(
                        "min-w-8  duration-200 ease-linear",
                        "hover:bg-primary/90 hover:text-primary-foreground ",
                        {
                          "bg-primary text-primary-foreground": isActive,
                        },
                      )}
                      render={
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                    >
                      <Icon />
                      {item.name}
                    </SidebarMenuButton>
                    {item.subMenu && (
                      <SidebarMenuSub>
                        {item.subMenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname.startsWith(subItem.href);
                          return (
                            <SidebarMenuItem key={subItem.name}>
                              <SidebarMenuButton
                                className={cx(
                                  "min-w-8  duration-200 ease-linear",
                                  "hover:bg-primary/90 hover:text-primary-foreground ",
                                  {
                                    "bg-primary text-primary-foreground":
                                      isSubActive,
                                  },
                                )}
                                render={
                                  <Link
                                    href={subItem.href}
                                    onClick={() => setOpenMobile(false)}
                                  />
                                }
                              >
                                <SubIcon />
                                {subItem.name}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <CustomerLookupButton
                      variant="ghost"
                      className="w-full justify-start"
                    >
                      <Search /> Search
                    </CustomerLookupButton>
                  }
                ></SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser
              user={{
                name: user?.name || "",
                role: user?.role || "",
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <CustomerLookup />
    </SidebarUI>
  );
}
