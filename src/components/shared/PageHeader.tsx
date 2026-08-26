import { SidebarTrigger } from "../ui/sidebar";

export default function PageHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
      <SidebarTrigger />
      <div className="bg-border h-5 w-px"></div>
      {children}
    </h1>
  );
}
