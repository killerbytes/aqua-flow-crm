"use server";

import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import {
  CustomerFormData,
  CustomerSchema,
  EquipmentLogFormData,
  EquipmentLogSchema,
  SpecialPricingFormData,
  SpecialPricingSchema,
} from "../schemas/zodSchemas";
import { CustomerService } from "../services/customer.service";
import { EquipmentService } from "../services/equipment.service";

export const getCustomersAction = createProtectedAction({
  permission: "CREATE_ORDER",
  handler: async () => {
    return await CustomerService.getAll();
  },
});

export const createCustomerAction = createProtectedAction({
  permission: "CREATE_ORDER",
  schema: CustomerSchema,
  handler: async (_ctx, input: CustomerFormData) => {
    const result = await CustomerService.create(input);
    revalidatePath("/customers");
    return result;
  },
});

export const updateCustomerAction = createProtectedAction({
  permission: "CREATE_ORDER",
  schema: CustomerSchema,
  inputIndex: 1,
  handler: async (_ctx, id: number | string, input: CustomerFormData) => {
    const result = await CustomerService.update(id, input);
    revalidatePath("/customers");
    return result;
  },
});

export const deleteCustomerAction = createProtectedAction({
  permission: "MANAGE_USERS",
  handler: async (_ctx, id: number | string) => {
    const result = await CustomerService.delete(id);
    revalidatePath("/customers");
    return result;
  },
});

export const lookupCustomerAction = createProtectedAction({
  permission: "CREATE_ORDER",
  handler: async (_ctx, term: string, isActiveOnly: boolean = false) => {
    return await CustomerService.lookup(term, isActiveOnly);
  },
});

export const logEquipmentAction = createProtectedAction({
  permission: "LOG_EQUIPMENT",
  schema: EquipmentLogSchema,
  handler: async (ctx, input: EquipmentLogFormData) => {
    const result = await EquipmentService.logEquipment(input, ctx.user.userId);
    revalidatePath("/inventory");
    revalidatePath("/customers");
    return result;
  },
});

export const setSpecialPricingAction = createProtectedAction({
  permission: "MANAGE_CUSTOMERS",
  schema: SpecialPricingSchema,
  handler: async (_ctx, input: SpecialPricingFormData) => {
    const result = await CustomerService.setSpecialPricing(input);
    revalidatePath(`/customers/${input.customerId}`);
    return result;
  },
});
