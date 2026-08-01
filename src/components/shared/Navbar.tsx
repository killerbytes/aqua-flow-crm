"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleSelector } from "./RoleSelector";
import {
  Droplet,
  Users,
  Package,
  ShoppingBag,
  LayoutDashboard,
  Tag,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders", href: "/orders", icon: ShoppingBag },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Products", href: "/products", icon: Tag },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Users", href: "/users", icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 group-hover:border-cyan-500/50 transition-colors">
            <Droplet className="w-5 h-5 text-cyan-400 fill-cyan-400/20 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-lg text-slate-100 tracking-tight">
              <span>Crystal Clear</span>
              <span className="text-cyan-400">CRM</span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block -mt-1">
              AquaFlow Next Edition
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 text-xs font-medium text-slate-300">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20 shadow-sm"
                    : "hover:text-slate-100 hover:bg-slate-900/60 text-slate-400"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <RoleSelector />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 text-xs gap-1.5 px-2.5 py-1 h-8"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
