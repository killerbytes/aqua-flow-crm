import {
  CustomerStatus,
  EquipmentActionType,
  InventoryAdjustmentType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "@/lib/definitions";
import { z } from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z
    .string()
    .min(11, "Mobile number must be 11 digits")
    .regex(/^(?:\+63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/, {
      message: "Invalid mobile number",
    })
    .or(z.literal(""))
    .or(z.null())
    .or(z.undefined()),
  notes: z.string().optional(),
  barangayId: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
});

export const SpecialPricingSchema = z.object({
  customerId: z.number().int().positive(),
  productId: z.number().int().positive("Product is required"),
  discountAmount: z.coerce.number().positive("Discount amount is required"),
});

export const ProductInventorySchema = z.object({
  name: z.string().min(2, "Product name required"),
  unitPrice: z.coerce.number().nonnegative(),
  stockInStation: z.coerce.number().optional(),
  stockWithCustomers: z.coerce.number().optional(),
  stockDamaged: z.coerce.number().optional(),
  stockLost: z.coerce.number().optional(),
  isLendOnly: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/** What a product's own form may change. Stock moves only through the ledger. */
export const ProductDetailsSchema = ProductInventorySchema.omit({
  stockInStation: true,
  stockWithCustomers: true,
  stockDamaged: true,
  stockLost: true,
});

export const EquipmentLogSchema = z.object({
  customerId: z.number().int().positive(),
  productId: z.number().int().positive("Equipment / Product is required"),
  actionType: z.nativeEnum(EquipmentActionType),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

export const EquipmentLedgerSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  fromAccountType: z.string(),
  fromAccountId: z.number().int().optional().nullable(),
  toAccountType: z.string(),
  toAccountId: z.number().int().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  referenceType: z.string().optional(),
  referenceId: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

export const OrderItemsSchema = z
  .array(
    z.object({
      productId: z.number().int().positive("Product is required"),
      quantity: z.number().int().positive(),
      unitPrice: z.number().optional(),
      discount: z.number().min(0).optional().default(0),
    }),
  )
  .min(1, "At least one item is required");

export const OrderSchema = z.object({
  customerId: z.number().int().positive("Customer is required"),
  status: z.nativeEnum(OrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  createdAt: z.union([z.date(), z.string()]).optional(),
  items: OrderItemsSchema,
});

export const PaymentSchema = OrderSchema.omit({
  customerId: true,
  status: true,
  items: true,
  paymentStatus: true,
}).extend({
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentNotes: z.string().optional(),
});

export const UserSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(2),
  password: z.string().min(4, "Password must be at least 4 characters"),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional(),
});

export const LoginSchema = UserSchema.omit({
  name: true,
  role: true,
  isActive: true,
});

export const UserFormSchema = UserSchema.extend({
  confirmPassword: z.string().min(4, "Password must be at least 4 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const UserFormUpdateSchema = UserSchema.omit({
  password: true,
});

export const ChangePasswordSchema = UserSchema.extend({
  confirmPassword: z.string().min(4, "Password must be at least 4 characters"),
})
  .omit({
    name: true,
    username: true,
    role: true,
    isActive: true,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const AdjustmentSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  adjustmentType: z.nativeEnum(InventoryAdjustmentType),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

export const InvoiceSchema = z.object({
  customerId: z.number().int().positive("Customer is required"),
  dateIssued: z.union([z.date(), z.string()]).optional(),
  dueDate: z.union([z.date(), z.string()]).optional(),
  paymentDate: z.union([z.date(), z.string()]).optional(),
  status: z.nativeEnum(InvoiceStatus),
  items: z.array(z.number()).min(1, "At least one order is required"),
});

export const VoidInvoiceSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason"),
});

export const ReversePaymentSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason"),
});

export const InvoicePaymentSchema = z.object({
  invoiceId: z.number().int().positive("Invoice is required"),
  paymentAmount: z.number().positive("Payment amount is required"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentNotes: z.string().optional(),
  paymentDate: z.union([z.date(), z.string()]).optional(),
});

export type AdjustmentFormData = z.infer<typeof AdjustmentSchema>;
export type ProductFormData = z.infer<typeof ProductInventorySchema>;
export type CustomerFormData = z.infer<typeof CustomerSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type UserFormData = z.infer<typeof UserFormSchema>;
export type UserFormUpdateData = z.infer<typeof UserFormUpdateSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type EquipmentLogFormData = z.infer<typeof EquipmentLogSchema>;
export type SpecialPricingFormData = z.infer<typeof SpecialPricingSchema>;
export type PaymentFormData = z.infer<typeof PaymentSchema>;
export type OrderFormData = z.infer<typeof OrderSchema>;
export type OrderItemsFormData = z.infer<typeof OrderItemsSchema>;
export type InvoiceFormData = z.infer<typeof InvoiceSchema>;
export type InvoicePaymentFormData = z.infer<typeof InvoicePaymentSchema>;
export type VoidInvoiceFormData = z.infer<typeof VoidInvoiceSchema>;
export type ReversePaymentFormData = z.infer<typeof ReversePaymentSchema>;
