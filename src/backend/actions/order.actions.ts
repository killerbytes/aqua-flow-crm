"use server";

import { OrderStatus } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import {
  OrderFormData,
  OrderSchema,
  PaymentFormData,
  PaymentSchema,
} from "../schemas/zodSchemas";
import { CustomerService } from "../services/customer.service";
import { OrderQueryParams, OrderService } from "../services/order.service";

export const getOrdersAction = createProtectedAction({
  permission: "VIEW_ORDERS",
  handler: async (ctx, input: OrderQueryParams) => {
    return await OrderService.getAll(input);
  },
});

export const getWalkInCustomerAction = createProtectedAction({
  permission: "CREATE_ORDER",
  handler: async () => {
    return await CustomerService.getOrCreateWalkIn();
  },
});

export const createOrderAction = createProtectedAction({
  permission: "CREATE_ORDER",
  schema: OrderSchema,
  handler: async (ctx, input: OrderFormData) => {
    const result = await OrderService.createForStaff(input, ctx.user.userId);
    revalidatePath("/orders");
    return result;
  },
});

export const updateOrderStatusAction = createProtectedAction({
  permission: "UPDATE_ORDER",
  handler: async (ctx, id: number | string, status: OrderStatus) => {
    console.log(
      `[updateOrderStatusAction] Updating order #${id} status to ${status} by user:`,
      ctx.user,
    );
    const result = await OrderService.updateStatus(id, status, ctx.user);
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
  handler: async (_ctx, input: PaymentFormData, id: number | string) => {
    const result = await OrderService.makePayment(input, Number(id));
    revalidatePath("/orders");
    return result;
  },
});
