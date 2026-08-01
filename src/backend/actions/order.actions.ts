"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "../auth/context";
import { checkPermission } from "../rbac/permissions";
import { OrderService } from "../services/order.service";

export async function createOrderAction(input: any) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "CREATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const userId = context.user?.userId || 1;
  const result = await OrderService.createOrder(input, userId);
  revalidatePath("/orders");
  return result;
}

export async function updateOrderStatusAction(
  id: number | string,
  status: string,
) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "UPDATE_ORDER")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.updateOrderStatus(id, status);
  revalidatePath("/orders");
  return result;
}

export async function deleteOrderAction(id: number | string) {
  const context = await getAuthContext();
  const role = context.user?.role || "ADMIN";
  if (!checkPermission(role as any, "MANAGE_USERS")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  const result = await OrderService.deleteOrder(id);
  revalidatePath("/orders");
  return result;
}
