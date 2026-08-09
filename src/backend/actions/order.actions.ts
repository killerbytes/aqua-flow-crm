"use server";

import { OrderStatus } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { getAuthContext, requireAuth } from "../auth/context";
import { initDatabase } from "../db/database";
import { checkPermission } from "../rbac/permissions";
import { OrderService } from "../services/order.service";

export async function createOrderAction(input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.create(input, user.userId);
  revalidatePath("/orders");
  return result;
}

export async function updateOrderStatusAction(
  id: number | string,
  status: OrderStatus,
) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "UPDATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.updateStatus(id, status);
  revalidatePath("/orders");
  return result;
}

export async function deleteOrderAction(id: number | string) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.delete(id);
  revalidatePath("/orders");
  return result;
}

export async function makePaymentAction(id: number | string, input: any) {
  await initDatabase();
  const context = await getAuthContext();
  const user = requireAuth(context);
  if (!checkPermission(user.role, "UPDATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.makePayment(Number(id), input);
  revalidatePath("/orders");
  return result;
}
