"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuthContext, requireAuth } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission } from "../rbac/permissions";
import { ChangePasswordData } from "../schemas/zodSchemas";
import { AuthService } from "../services/auth.service";

export async function loginAction(username: string, password: string) {
  try {
    await initDatabase();
    const { token, user } = await AuthService.login(username, password);

    try {
      const cookieStore = await cookies();
      cookieStore.set("token", token, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax",
      });
    } catch (err) {
      console.warn("Cookie set error (outside request context):", err);
    }

    return { success: true, token, user };
  } catch (err: any) {
    return { success: false, error: err.message || "Invalid credentials" };
  }
}

export async function createUserAction(input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_USER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.createUser(input);
  revalidatePath("/users");
  return result;
}

export async function updateUserAction(id: number | string, input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.updateUser(id, input);
  revalidatePath("/users");
  return result;
}

export async function deleteUserAction(id: number | string) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.deleteUser(id);
  revalidatePath("/users");
  return result;
}

export async function changePasswordAction(
  id: number,
  input: ChangePasswordData,
) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await AuthService.changePassword(id, input);
  revalidatePath("/users");
  return result;
}
