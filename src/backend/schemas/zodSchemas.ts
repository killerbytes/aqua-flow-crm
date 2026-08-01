import {
  CustomerType,
  EquipmentActionType,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "@/lib/definitions";
import { z } from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 digits"),
  customerType: z.nativeEnum(CustomerType),
  notes: z.string().optional(),
  barangayId: z.string().optional(),
});

export const ProductInventorySchema = z.object({
  name: z.string().min(2, "Product name required"),
  stockInStation: z
    .number()
    .int()
    .min(0, "Stock cannot be negative")
    .optional(),
  unitPrice: z.coerce.number().positive("Unit price must be positive"),
  isLendOnly: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const EquipmentLogSchema = z.object({
  customerId: z.number().int().positive(),
  productId: z.number().int().positive(),
  actionType: z.nativeEnum(EquipmentActionType),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

export const OrderSchema = z.object({
  customerId: z.number().int().positive(),
  status: z.nativeEnum(OrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        discount: z.number().min(0).optional().default(0),
      }),
    )
    .min(1, "At least one item is required"),
});

export const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole),
});

export const LoginSchema = UserSchema.omit({
  name: true,
  role: true,
});
