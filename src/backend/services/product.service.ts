import { PAGINATION } from "@/lib/definitions";
import { InventoryAdjustment, ProductInventory } from "../models";
import {
  AdjustmentFormData,
  AdjustmentSchema,
  ProductInventorySchema,
} from "../schemas/zodSchemas";

import { handleServiceError } from "./errorHandler";

export interface InventoryLogQueryParams {
  limit?: number;
  page?: number;
  query?: {
    customerId?: number;
    productId?: number;
    actionType?: string;
  };
}

export class ProductService {
  static async getAll() {
    const products = await ProductInventory.findAll({
      order: [["name", "ASC"]],
    });
    return products.map((r) => r.get({ plain: true }));
  }

  static async get(id: number | string) {
    const product = await ProductInventory.findByPk(Number(id));
    return product?.get({ plain: true });
  }

  static async create(input: any) {
    const validatedData = ProductInventorySchema.parse(input);
    try {
      const product = await ProductInventory.create(validatedData);
      return product?.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async update(id: number | string, input: any) {
    const validatedData = ProductInventorySchema.partial().parse(input);
    const product = await ProductInventory.findByPk(Number(id));
    if (!product) throw new Error("Product not found");

    try {
      await product.update(validatedData);
      return product?.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async delete(id: number | string) {
    const product = await ProductInventory.findByPk(id);
    if (!product) throw new Error("Product not found");

    try {
      const count = await ProductInventory.destroy({
        where: { productId: Number(id) },
      });
      return count > 0;
    } catch (error) {
      handleServiceError(error);
    }
  }
}

export class InventoryService {
  static async getAll(params: InventoryLogQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      query = {},
    } = params;

    const where: any = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.productId) where.productId = query.productId;
    if (query.actionType) where.actionType = query.actionType;

    const offset = (page - 1) * limit;
    const { rows, count } = await InventoryAdjustment.findAndCountAll({
      offset,
      limit,
      where,
      include: [{ model: ProductInventory, as: "product" }],
      order: [["createdAt", "DESC"]],
    });

    return {
      rows: rows.map((r) => r.get({ plain: true })),
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(offset / limit) + 1,
      },
    };
  }

  static async createAdjustment(input: AdjustmentFormData) {
    const validatedData = AdjustmentSchema.parse(input);

    const product = await ProductInventory.findByPk(
      Number(validatedData.productId),
    );
    if (!product) throw new Error("Product not found");

    await InventoryAdjustment.create(validatedData);
    return product?.get({ plain: true });
  }
}
