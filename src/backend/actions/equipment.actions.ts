"use server";

import { revalidatePath } from "next/cache";
import { EquipmentService } from "../services/equipment.service";
import { checkPermission } from "../rbac/permissions";
import { getAuthContext } from "../auth/context";

export async function logEquipmentAction(input: any) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "LOG_EQUIPMENT")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const userId = context.user?.user_id || 1;
  const result = await EquipmentService.logEquipment(input, userId);
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return result;
}
