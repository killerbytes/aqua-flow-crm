"use server";

import { revalidatePath } from "next/cache";
import { AuthService } from "../services/auth.service";
import { checkPermission } from "../rbac/permissions";
import { getAuthContext } from "../auth/context";

export async function loginAction(email: string, password: string) {
  return await AuthService.login(email, password);
}

export async function createUserAction(input: any) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "CREATE_USER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.createUser(input);
  revalidatePath("/users");
  return result;
}

export async function updateUserAction(id: number | string, input: any) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.updateUser(id, input);
  revalidatePath("/users");
  return result;
}

export async function deleteUserAction(id: number | string) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.deleteUser(id);
  revalidatePath("/users");
  return result;
}
