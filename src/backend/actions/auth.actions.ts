"use server";

import { sessionCookieOptions } from "@/lib/auth.edge";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { initDatabase } from "../db/database";
import { createProtectedAction } from "../lib/safe-action";
import {
  ChangePasswordData,
  ChangePasswordSchema,
  UserFormSchema,
  UserFormUpdateSchema,
} from "../schemas/zodSchemas";
import { AuthService } from "../services/auth.service";

export async function loginAction(username: string, password: string) {
  try {
    await initDatabase();
    const { token, user } = await AuthService.login(username, password);

    try {
      const cookieStore = await cookies();
      cookieStore.set("token", token, sessionCookieOptions());
    } catch (err) {
      console.warn("Cookie set error (outside request context):", err);
    }

    // The token stays in the httpOnly cookie and is never sent to page scripts.
    return { success: true as const, user };
  } catch (err: any) {
    return {
      success: false as const,
      error: err.message || "Invalid credentials",
    };
  }
}

export const createUserAction = createProtectedAction({
  permission: "CREATE_USER",
  schema: UserFormSchema,
  handler: async (_ctx, input: any) => {
    const result = await AuthService.createUser(input);
    revalidatePath("/users");
    return result;
  },
});

export const updateUserAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: UserFormUpdateSchema,
  inputIndex: 1,
  handler: async (_ctx, id: number | string, input: any) => {
    const result = await AuthService.updateUser(id, input);
    revalidatePath("/users");
    return result;
  },
});

export const changePasswordAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: ChangePasswordSchema,
  inputIndex: 1,
  handler: async (_ctx, id: number, input: ChangePasswordData) => {
    const result = await AuthService.changePassword(id, input);
    revalidatePath("/users");
    return result;
  },
});
