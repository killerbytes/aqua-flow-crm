"use server";

import { revalidatePath } from "next/cache";
import { initDatabase } from "../db/database";
import { getAuthContext } from "../auth/context";
import { checkPermission } from "../rbac/permissions";
import { CustomerService } from "../services/customer.service";

export async function getCustomersAction() {
  await initDatabase();
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.getAll();
  return result;
}

export async function createCustomerAction(input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.create(input);
  revalidatePath("/customers");
  return result;
}

export async function updateCustomerAction(id: number | string, input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.update(id, input);
  revalidatePath("/customers");
  return result;
}

export async function deleteCustomerAction(id: number | string) {
  await initDatabase();
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.delete(id);
  revalidatePath("/customers");
  return result;
}
