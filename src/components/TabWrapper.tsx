"use client";
import { Tabs } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

export default function TabWrapper({
  children,
  defaultValue,
}: {
  children: React.ReactNode;
  defaultValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === tab) return;

    params.set("tab", value);
    params.delete("limit");
    params.delete("page");
    params.delete("sort");
    params.delete("order");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs defaultValue={defaultValue} onValueChange={handleTabChange}>
      {children}
    </Tabs>
  );
}
