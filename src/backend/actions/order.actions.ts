"use server";

import { OrderStatus } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import { checkPermission } from "../rbac/permissions";
import {
  OrderFormData,
  OrderSchema,
  OrderUpdateFormData,
  OrderUpdateSchema,
  PaymentFormData,
  PaymentSchema,
  ReversePaymentFormData,
  ReversePaymentSchema,
} from "../schemas/zodSchemas";
import { CustomerService } from "../services/customer.service";
import { OrderQueryParams, OrderService } from "../services/order.service";

export const getOrdersAction = createProtectedAction({
  permission: "VIEW_ORDERS",
  handler: async (_ctx, input: OrderQueryParams) => {
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
    revalidatePath(`/customers/${input.customerId}`);
    return result;
  },
});

export const updateOrderAction = createProtectedAction({
  permission: "UPDATE_ORDER",
  schema: OrderUpdateSchema,
  inputIndex: 1,
  handler: async (_ctx, id: number | string, input: OrderUpdateFormData) => {
    const result = await OrderService.update(id, input);
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    if (result) revalidatePath(`/customers/${result.customerId}`);
    return result;
  },
});

export const updateOrderStatusAction =createProtectedAction({
  permission: "UPDATE_DELIVERY_STATUS",
  handler: async (ctx, id: number | string, status: OrderStatus) => {
    if (
      status === OrderStatus.CANCELLED &&
      !checkPermission(ctx.user.role, "CANCEL_ORDER")
    ) {
      throw new Error("Forbidden: insufficient permissions");
    }

    console.log(
      `[updateOrderStatusAction] Updating order #${id} status to ${status} by user:`,
      ctx.user,
    );
    const result = await OrderService.updateStatus(id, status, ctx.user);
    revalidatePath("/orders");
    return result;
  },
});

export const makePaymentAction = createProtectedAction({
  permission: "UPDATE_ORDER",
  schema: PaymentSchema,
  handler: async (ctx, input: PaymentFormData, id: number | string) => {
    const result = await OrderService.makePayment(
      input,
      Number(id),
      ctx.user.userId,
    );
    revalidatePath("/orders");
    return result;
  },
});

export const reverseOrderPaymentAction = createProtectedAction({
  permission: "REVERSE_PAYMENT",
  schema: ReversePaymentSchema,
  inputIndex: 1,
  handler: async (
    ctx,
    paymentId: number | string,
    input: ReversePaymentFormData,
  ) => {
    const result = await OrderService.reversePayment(
      paymentId,
      input,
      ctx.user.userId,
    );
    revalidatePath("/orders");
    revalidatePath(`/orders/${result.orderId}`);
    return result;
  },
});
