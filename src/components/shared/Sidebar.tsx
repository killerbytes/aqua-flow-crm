"use client";

import { UserRole } from "@/lib/definitions";
import { useAuthStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { cx } from "class-variance-authority";
import {
  Droplet,
  LayoutDashboard,
  LogOut,
  Search,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
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
  ];

  // if (user?.role === UserRole.CASHIER || user?.role === UserRole.ADMIN) {
  //   navItems.push({
  //     name: "Reports",
  //     href: "/reports",
  //     icon: FileText,
  //     subMenu: [
  //       {
  //         name: "Customers",
  //         href: "/reports/customers",
  //         icon: FileText,
  //       },
  //       {
  //         name: "Monthly Sales",
  //         href: "/reports/monthly-sales",
  //         icon: FileText,
  //       },
  //       { name: "Yearly Sales", href: "/reports/yearly-sales", icon: FileText },
  //     ],
  //   });
  // }
  if (user?.role === UserRole.ADMIN) {
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
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <CustomerLookup>
                  <SidebarMenuButton
                    onClick={() => setCustomerLookupModalOpen(true)}
                  >
                    <Search />
                    Search Customer
                  </SidebarMenuButton>
                </CustomerLookup>
              </SidebarMenuItem>
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
                                  },
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
                <Button onClick={handleLogout} size="icon">
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
