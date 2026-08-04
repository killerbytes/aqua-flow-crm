"use server";

import { revalidatePath } from "next/cache";
import { initDatabase } from "../db/database";
import { getAuthContext, requireAuth } from "../auth/context";
import { checkPermission } from "../rbac/permissions";
import { EquipmentService } from "../services/equipment.service";

export async function logEquipmentAction(input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "LOG_EQUIPMENT")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await EquipmentService.logEquipment(input, user.userId);
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return result;
}
