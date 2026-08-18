"use client";

import { UserRole } from "@/lib/definitions";
import { useAuthStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { cx } from "class-variance-authority";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Search,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CustomerLookup from "../CustomerLookup";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
  SidebarMenuSub,
  Sidebar as SidebarUI,
} from "../ui/sidebar";
interface NavItem {
  name: string;
  href: string;
  icon: any;
  subMenu?: NavItem[];
}
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { setCustomerFormModalOpen, setCustomerLookupModalOpen } = useUIStore();

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

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Tag },
    { name: "Invoices", href: "/invoices", icon: Receipt },
  ];

  if (user?.role === UserRole.CASHIER || user?.role === UserRole.ADMIN) {
    navItems.push({
      name: "Reports",
      href: "/reports/customers",
      icon: FileText,
      subMenu: [
        {
          name: "Customers",
          href: "/reports/customers",
          icon: FileText,
        },
        {
          name: "Monthly Sales",
          href: "/reports/monthly-sales",
          icon: FileText,
        },
        { name: "Yearly Sales", href: "/reports/yearly-sales", icon: FileText },
      ],
    });
  }
  if (user?.role === UserRole.ADMIN) {
    navItems.push({ name: "Users", href: "/users", icon: UserCog });
  }

  return (
    <SidebarUI variant="inset" className="print:hidden">
      <SidebarHeader className="items-center">
        <Image
          src="/logo.jpg"
          alt={process.env.NEXT_PUBLIC_APP_NAME || ""}
          width={200}
          height={200}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <CustomerLookup>
            <Search /> Search Customer
          </CustomerLookup>

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
                        }
                      )}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      {item.name}
                    </SidebarMenuButton>
                    {item.subMenu && (
                      <SidebarMenuSub>
                        {item.subMenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive =
                            pathname.startsWith(item.href) && pathname !== "/"
                              ? true
                              : false;
                          return (
                            <SidebarMenuItem key={subItem.name}>
                              <SidebarMenuButton
                                className={cx(
                                  "min-w-8  duration-200 ease-linear",
                                  "hover:bg-primary/90 hover:text-primary-foreground ",
                                  {
                                    "bg-primary text-primary-foreground":
                                      isSubActive,
                                  }
                                )}
                                render={<Link href={subItem.href} />}
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold flex flex-col">
                    {user?.name}
                    <span className="text-muted-foreground text-[11px]">
                      {user?.role}
                    </span>
                  </p>
                </div>
                <Button variant="outline" onClick={handleLogout} size="icon">
                  <LogOut size={16} />
                </Button>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  );
}
