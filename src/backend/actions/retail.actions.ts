"use server";

import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import {
  RetailProductFormData,
  RetailProductSchema,
  RetailSaleFormData,
  RetailSaleSchema,
  RetailStockAdjustmentFormData,
  RetailStockAdjustmentSchema,
  VoidRetailSaleFormData,
  VoidRetailSaleSchema,
} from "../schemas/zodSchemas";
import {
  RetailProductService,
  RetailSaleService,
} from "../services/retail.service";

/** Retail figures show on the dashboard and, for a buyer, their customer page. */
const revalidateRetail = (customerId?: number) => {
  revalidatePath("/retail");
  revalidatePath("/");
  if (customerId) revalidatePath(`/customers/${customerId}`);
};

export const getRetailProductsAction = createProtectedAction({
  permission: "VIEW_RETAIL",
  handler: async () => {
    return await RetailProductService.getAll();
  },
});

export const createRetailProductAction = createProtectedAction({
  permission: "MANAGE_PRODUCTS",
  schema: RetailProductSchema,
  handler: async (_ctx, input: RetailProductFormData) => {
    const result = await RetailProductService.create(input);
    revalidateRetail();
    return result;
  },
});

export const updateRetailProductAction = createProtectedAction({
  permission: "MANAGE_PRODUCTS",
  schema: RetailProductSchema.partial(),
  inputIndex: 1,
  handler: async (
    _ctx,
    id: number | string,
    input: Partial<RetailProductFormData>,
  ) => {
    const result = await RetailProductService.update(id, input);
    revalidateRetail();
    return result;
  },
});

export const adjustRetailStockAction = createProtectedAction({
  permission: "ADJUST_INVENTORY",
  schema: RetailStockAdjustmentSchema,
  handler: async (ctx, input: RetailStockAdjustmentFormData) => {
    const result = await RetailProductService.adjustStock(
      input,
      ctx.user.userId,
    );
    revalidateRetail();
    return result;
  },
});

export const createRetailSaleAction = createProtectedAction({
  permission: "SELL_RETAIL",
  schema: RetailSaleSchema,
  handler: async (ctx, input: RetailSaleFormData) => {
    const result = await RetailSaleService.create(input, ctx.user.userId);
    revalidateRetail(result.customerId);
    return result;
  },
});

export const voidRetailSaleAction = createProtectedAction({
  permission: "VOID_RETAIL_SALE",
  schema: VoidRetailSaleSchema,
  inputIndex: 1,
  handler: async (ctx, id: number | string, input: VoidRetailSaleFormData) => {
    const result = await RetailSaleService.voidSale(id, input, ctx.user.userId);
    revalidateRetail(result.customerId);
    return result;
  },
});
