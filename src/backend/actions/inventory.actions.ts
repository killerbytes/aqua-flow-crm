"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireAuth } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission } from "../rbac/permissions";
import { AdjustmentFormData } from "../schemas/zodSchemas";
import { InventoryService } from "../services/inventory.service";

export async function getInventoryAction() {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await InventoryService.getAll();
  return result;
}

export async function createAdjustmentAction(input: AdjustmentFormData) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await InventoryService.createAdjustment(input);
  revalidatePath("/products");
  return result;
}
