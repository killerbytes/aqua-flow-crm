import { ProductInventory } from "../models";
import { ProductInventorySchema } from "../schemas/zodSchemas";
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
      await product.destroy();
      return true;
    } catch (error) {
      handleServiceError(error);
    }
  }
}

export { InventoryService } from "./inventory.service";
