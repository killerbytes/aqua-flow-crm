"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireAuth } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission } from "../rbac/permissions";
import { CustomerService } from "../services/customer.service";

export async function getCustomersAction() {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.getAll();
  return result;
}

export async function createCustomerAction(input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.create(input);
  revalidatePath("/customers");
  return result;
}

export async function updateCustomerAction(id: number | string, input: any) {
  await initDatabase();
  const context = await getAuthContext();

  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.update(id, input);
  revalidatePath("/customers");
  return result;
}

export async function deleteCustomerAction(id: number | string) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await CustomerService.delete(id);
  revalidatePath("/customers");
  return result;
}

export async function lookupCustomerAction(
  term: string,
  isActiveOnly: boolean = false,
) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }
  const result = await CustomerService.lookup(term, isActiveOnly);
  return result;
}
