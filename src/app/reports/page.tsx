import { requirePagePermission } from "@/backend/auth/context";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  await requirePagePermission("VIEW_REPORTS");
  redirect("/reports/customers");
}
