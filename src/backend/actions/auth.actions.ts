"use server";

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

    return { success: true as const, token, user };
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
  handler: async (_ctx, id: number | string, input: any) => {
    const result = await AuthService.updateUser(id, input);
    revalidatePath("/users");
    return result;
  },
});

export const changePasswordAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: ChangePasswordSchema,
  handler: async (_ctx, id: number, input: ChangePasswordData) => {
    const result = await AuthService.changePassword(id, input);
    revalidatePath("/users");
    return result;
  },
});
