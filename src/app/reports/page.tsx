import { requirePageUser } from "@/backend/auth/context";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  await requirePageUser();
  redirect("/reports/customers");
}
