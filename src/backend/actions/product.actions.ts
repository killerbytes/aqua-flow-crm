"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "../auth/context";
import { checkPermission } from "../rbac/permissions";
import { ProductInventorySchema } from "../schemas/zodSchemas";
import { ProductService } from "../services/product.service";

export async function getProductsAction() {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.getAll();
  return result;
}
export async function createProductAction(input: any) {
  const validatedData = ProductInventorySchema.parse(input);
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.create(validatedData);
  revalidatePath("/inventory");
  return result;
}

export async function updateProductAction(id: number | string, input: any) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.update(id, input);
  revalidatePath("/inventory");
  return result;
}

export async function deleteProductAction(id: number | string) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.delete(id);
  revalidatePath("/inventory");
  return result;
}
