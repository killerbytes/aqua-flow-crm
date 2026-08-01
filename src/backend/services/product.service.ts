import { ProductInventory } from "../models";
import { ProductInventorySchema } from "../schemas/zodSchemas";

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
    const product = await ProductInventory.create(validatedData);
    return product?.get({ plain: true });
  }

  static async update(id: number | string, input: any) {
    const validatedData = ProductInventorySchema.partial().parse(input);
    const product = await ProductInventory.findByPk(Number(id));
    if (!product) throw new Error("Product not found");

    await product.update(validatedData);
    return product?.get({ plain: true });
  }

  static async delete(id: number | string) {
    const product = await ProductInventory.findByPk(id);
    if (!product) throw new Error("Product not found");

    const count = await ProductInventory.destroy({
      where: { productId: Number(id) },
    });
    return count > 0;
  }

  // Aliases for compatibility
  static getProducts = ProductService.getAll;
  static getProductById = ProductService.get;
  static createProduct = ProductService.create;
  static updateProduct = ProductService.update;
  static deleteProduct = ProductService.delete;
}
