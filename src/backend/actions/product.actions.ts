"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireAuth } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission } from "../rbac/permissions";
import { ProductInventorySchema } from "../schemas/zodSchemas";
import { ProductService } from "../services/product.service";

export async function getProductsAction() {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "ADJUST_INVENTORY")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.getAll();
  return result;
}

export async function createProductAction(input: any) {
  await initDatabase();
  const validatedData = ProductInventorySchema.parse(input);
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_PRODUCTS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.create(validatedData);
  revalidatePath("/products");
  return result;
}

export async function updateProductAction(id: number | string, input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_PRODUCTS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.update(id, input);
  revalidatePath("/products");
  return result;
}

export async function deleteProductAction(id: number | string) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_PRODUCTS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await ProductService.delete(id);
  revalidatePath("/products");
  return result;
}
