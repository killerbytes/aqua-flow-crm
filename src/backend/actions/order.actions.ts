"use server";

import { OrderStatus } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import { OrderSchema, PaymentSchema } from "../schemas/zodSchemas";
import { OrderService } from "../services/order.service";

export const createOrderAction = createProtectedAction({
  permission: "CREATE_ORDER",
  schema: OrderSchema,
  handler: async (ctx, input: any) => {
    const result = await OrderService.create(input, ctx.user.userId);
    revalidatePath("/orders");
    return result;
  },
});

export const updateOrderStatusAction = createProtectedAction({
  permission: "UPDATE_ORDER",
  handler: async (_ctx, id: number | string, status: OrderStatus) => {
    const result = await OrderService.updateStatus(id, status);
    revalidatePath("/orders");
    return result;
  },
});

export const deleteOrderAction = createProtectedAction({
  permission: "MANAGE_USERS",
  handler: async (_ctx, id: number | string) => {
    const result = await OrderService.delete(id);
    revalidatePath("/orders");
    return result;
  },
});

export const makePaymentAction = createProtectedAction({
  permission: "UPDATE_ORDER",
  schema: PaymentSchema,
  handler: async (_ctx, id: number | string, input: any) => {
    const result = await OrderService.makePayment(Number(id), input);
    revalidatePath("/orders");
    return result;
  },
});
