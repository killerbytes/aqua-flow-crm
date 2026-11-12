import { OrderStatus } from "@/lib/definitions";
import { Transaction } from "sequelize";
import {
  Order,
  OrderDetail,
  ProductInventory,
  sequelize,
} from "../models";
import { ProductDetailsSchema } from "../schemas/zodSchemas";
import { countContainersOut, countLabel } from "./deleteBlockers";
import { handleServiceError } from "./errorHandler";

const STOCK_FIELDS = [
  "stockInStation",
  "stockWithCustomers",
  "stockDamaged",
  "stockLost",
] as const;

// Stock totals must match the ledger, so they only change through ledger
// entries. Refusing, rather than ignoring, makes a caller's mistake visible.
const rejectStockFields = (input: any) => {
  if (STOCK_FIELDS.some((field) => input?.[field] !== undefined)) {
    throw new Error(
      "Stock can only be changed with a stock adjustment, so it's recorded in the ledger",
    );
  }
};

/** Only one product is the default, so the previous one gives it up. */
const clearDefaultProduct = async (exceptProductId?: number) => {
  const existingDefault = await ProductInventory.findOne({
    where: { isDefault: true },
  });
  if (existingDefault && existingDefault.productId !== exceptProductId) {
    existingDefault.isDefault = false;
    await existingDefault.save();
  }
};

export class ProductService {
  static async getAll() {
    const products = await ProductInventory.findAll({
      order: [["productId", "ASC"]],
    });
    return products.map((r) => r.get({ plain: true }));
  }

  static async get(id: number | string) {
    const product = await ProductInventory.findByPk(Number(id));
    return product?.get({ plain: true });
  }

  static async create(input: any) {
    rejectStockFields(input);
    const validatedData = ProductDetailsSchema.parse(input);
    try {
      if (validatedData.isDefault) await clearDefaultProduct();
      const product = await ProductInventory.create(validatedData);
      return product?.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async update(id: number | string, input: any) {
    rejectStockFields(input);
    const validatedData = ProductDetailsSchema.partial().parse(input);
    const product = await ProductInventory.findByPk(Number(id));
    if (!product) throw new Error("Product not found");

    try {
      if (validatedData.isDefault) {
        await clearDefaultProduct(product.productId);
      }

      await product.update(validatedData);
      return product?.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  /**
   * Soft-deletes a product nobody still has or is waiting for. Its name stays on
   * past orders and ledger entries.
   */
  static async delete(id: number | string) {
    return await sequelize.transaction(async (t) => {
      // Locked so containers can't be issued while this is being deleted.
      const product = await ProductInventory.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!product) throw new Error("Product not found");

      const blockers = await getDeleteBlockers(product.productId, t);
      if (blockers.length > 0) {
        throw new Error(`Can't delete this product: ${blockers.join(", ")}`);
      }

      try {
        await product.destroy({ transaction: t });
        return true;
      } catch (error) {
        handleServiceError(error);
      }
    });
  }
}

const getDeleteBlockers = async (productId: number, transaction: Transaction) => {
  const blockers: string[] = [];

  const containersOut = await countContainersOut({ productId }, transaction);
  if (containersOut > 0) {
    blockers.push(countLabel(containersOut, "unit") + " still with customers");
  }

  const undelivered = await Order.count({
    // Counts orders, not lines. Naming a column here would break on PostgreSQL,
    // where it's order_id, so Sequelize picks the primary key itself.
    distinct: true,
    where: { status: [OrderStatus.PENDING, OrderStatus.OUT_FOR_DELIVERY] },
    include: [
      {
        model: OrderDetail,
        as: "orderDetails",
        where: { productId },
        required: true,
        attributes: [],
      },
    ],
    transaction,
  });
  if (undelivered > 0) {
    blockers.push(countLabel(undelivered, "undelivered order"));
  }

  return blockers;
};

export { InventoryService } from "./inventory.service";
