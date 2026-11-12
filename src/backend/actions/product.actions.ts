"use server";

import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import {
  AdjustmentFormData,
  AdjustmentSchema,
  ProductFormData,
  ProductInventorySchema,
} from "../schemas/zodSchemas";
import { InventoryService } from "../services/inventory.service";
import { ProductService } from "../services/product.service";

export const getProductsAction = createProtectedAction({
  permission: "VIEW_PRODUCTS",
  handler: async () => {
    return await ProductService.getAll();
  },
});

export const createProductAction = createProtectedAction({
  permission: "MANAGE_PRODUCTS",
  schema: ProductInventorySchema,
  handler: async (_ctx, input: ProductFormData) => {
    const result = await ProductService.create(input);
    revalidatePath("/products");
    return result;
  },
});

export const updateProductAction = createProtectedAction({
  permission: "MANAGE_PRODUCTS",
  handler: async (
    _ctx,
    id: number | string,
    input: Partial<ProductFormData>,
  ) => {
    const result = await ProductService.update(id, input);
    revalidatePath("/products");
    return result;
  },
});

export const deleteProductAction = createProtectedAction({
  permission: "MANAGE_PRODUCTS",
  handler: async (_ctx, id: number | string) => {
    const result = await ProductService.delete(id);
    revalidatePath("/products");
    return result;
  },
});

export const createAdjustmentAction = createProtectedAction({
  permission: "ADJUST_INVENTORY",
  schema: AdjustmentSchema,
  handler: async (ctx, input: AdjustmentFormData) => {
    const result = await InventoryService.createAdjustment(
      input,
      ctx.user.userId,
    );
    revalidatePath("/products");
    return result;
  },
});
