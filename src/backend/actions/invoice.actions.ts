"use server";

import { revalidatePath } from "next/cache";
import { createProtectedAction } from "../lib/safe-action";
import {
  InvoiceFormData,
  InvoicePaymentFormData,
  InvoiceSchema,
  ReversePaymentFormData,
  ReversePaymentSchema,
  VoidInvoiceFormData,
  VoidInvoiceSchema,
} from "../schemas/zodSchemas";
import { InvoiceService } from "../services/invoice.service";

export const createInvoiceAction = createProtectedAction({
  permission: "CREATE_INVOICE",
  schema: InvoiceSchema,
  handler: async (ctx, input: InvoiceFormData) => {
    const result = await InvoiceService.create(input, ctx.user.userId);
    revalidatePath("/orders");
    return result;
  },
});

export const voidInvoiceAction = createProtectedAction({
  permission: "VOID_INVOICE",
  schema: VoidInvoiceSchema,
  inputIndex: 1,
  handler: async (ctx, id: number | string, input: VoidInvoiceFormData) => {
    const result = await InvoiceService.voidInvoice(id, input, ctx.user.userId);
    revalidatePath("/orders");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return result;
  },
});

export const reversePaymentAction = createProtectedAction({
  permission: "REVERSE_PAYMENT",
  schema: ReversePaymentSchema,
  inputIndex: 1,
  handler: async (
    ctx,
    paymentId: number | string,
    input: ReversePaymentFormData,
  ) => {
    const result = await InvoiceService.reversePayment(
      paymentId,
      input,
      ctx.user.userId,
    );
    revalidatePath("/orders");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${result.invoiceId}`);
    return result;
  },
});

export const makeInvoicePaymentAction = createProtectedAction({
  permission: "PAY_INVOICE",
  handler: async (ctx, input: InvoicePaymentFormData) => {
    const result = await InvoiceService.payInvoice(input, ctx.user.userId);
    revalidatePath("/orders");
    revalidatePath("/invoices");
    if (input.invoiceId) {
      revalidatePath(`/invoices/${input.invoiceId}`);
    }
    return result;
  },
});
