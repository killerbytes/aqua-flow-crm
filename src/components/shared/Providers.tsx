"use client";

import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {children}
      <Toaster />
    </SidebarProvider>
  );
}
