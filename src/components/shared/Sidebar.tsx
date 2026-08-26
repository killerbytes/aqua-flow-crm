"use client";

import { UserRole } from "@/lib/definitions";
import { useAuthStore } from "@/lib/store";
import { cx } from "class-variance-authority";
import {
  FileText,
  LayoutDashboard,
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

  if (pathname === "/login") return null;

  const {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  } = useSidebar();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Products", href: "/products", icon: Tag },
    { name: "Invoices", href: "/invoices", icon: Receipt },
  ];

  const reportItems: NavItem[] = [
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
  ];
  if (user?.role === UserRole.ADMIN) {
    navItems.push({ name: "Users", href: "/users", icon: UserCog });
  }

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

        {/* <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {reportItems.map((item) => {
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
        </SidebarGroup> */}
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
