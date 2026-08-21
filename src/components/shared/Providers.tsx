import { getAuthContext } from "@/backend/auth/context";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/toast";
import MainLayout from "./MainLayout";
import Sidebar from "./Sidebar";

export default async function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthContext();

  return (
    <>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset>
          <MainLayout serverUser={context.user}>{children}</MainLayout>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </>
  );
}
