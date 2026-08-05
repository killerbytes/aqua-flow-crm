import {
  CustomerStatus,
  EquipmentActionType,
  InventoryAdjustmentType,
  OrderStatus,
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
    }),
  notes: z.string().optional(),
  barangayId: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
});

export const ProductInventorySchema = z.object({
  name: z.string().min(2, "Product name required"),
  unitPrice: z.coerce.number().nonnegative(),
  isLendOnly: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const EquipmentLogSchema = z.object({
  customerId: z.number().int().positive(),
  productId: z.number().int().positive("Equipment / Product is required"),
  actionType: z.nativeEnum(EquipmentActionType),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

export const OrderSchema = z.object({
  customerId: z.number().int().positive("Customer is required"),
  status: z.nativeEnum(OrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive("Product is required"),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        discount: z.number().min(0).optional().default(0),
      }),
    )
    .min(1, "At least one item is required"),
});

export const UserSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(2),
  password: z.string().min(4, "Password must be at least 6 characters"),
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

export const AdjustmentSchema = z.object({
  productId: z.number().int().positive("Product is required"),
  adjustmentType: z.nativeEnum(InventoryAdjustmentType),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

export type AdjustmentFormData = z.infer<typeof AdjustmentSchema>;
export type ProductFormData = z.infer<typeof ProductInventorySchema>;
export type CustomerFormData = z.infer<typeof CustomerSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type UserFormData = z.infer<typeof UserFormSchema>;
export type EquipmentLogFormData = z.infer<typeof EquipmentLogSchema>;
