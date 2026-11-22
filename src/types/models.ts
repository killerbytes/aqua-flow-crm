/**
 * The records that pages and client components work with. Services return
 * plain objects, not Sequelize instances, so these carry a model's columns and
 * included associations but none of its methods. Import record types from
 * here, not from the models, outside `src/backend`.
 */
import type * as Models from "@/backend/models";
import type { Plain } from "@/backend/models/plain";

export type Customer = Plain<Models.Customer>;
export type CustomerEquipmentBalance = Plain<Models.CustomerEquipmentBalance>;
export type CustomerSpecialPricing = Plain<Models.CustomerSpecialPricing>;
export type EquipmentLedgerEntry = Plain<Models.EquipmentLedgerEntry>;
export type Invoice = Plain<Models.Invoice>;
export type InvoiceDetail = Plain<Models.InvoiceDetail>;
export type InvoicePayment = Plain<Models.InvoicePayment>;
export type Order = Plain<Models.Order>;
export type OrderDetail = Plain<Models.OrderDetail>;
export type OrderPayment = Plain<Models.OrderPayment>;
export type ProductInventory = Plain<Models.ProductInventory>;
export type RetailProduct = Plain<Models.RetailProduct>;
export type RetailSale = Plain<Models.RetailSale>;
export type RetailSaleItem = Plain<Models.RetailSaleItem>;
export type RetailStockEntry = Plain<Models.RetailStockEntry>;
/** A user as the app passes it around: never with the password hash. */
export type User = Omit<Plain<Models.User>, "passwordHash">;
