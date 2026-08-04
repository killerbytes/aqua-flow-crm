import { PAGINATION } from "@/lib/definitions";
import { InventoryAdjustment, ProductInventory } from "../models";
import { AdjustmentFormData, AdjustmentSchema } from "../schemas/zodSchemas";

export interface InventoryLogQueryParams {
  limit?: number;
  page?: number;
  query?: {
    customerId?: number;
    productId?: number;
    actionType?: string;
  };
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
    console.log(validatedData);

    const product = await ProductInventory.findByPk(
      Number(validatedData.productId),
    );
    if (!product) throw new Error("Product not found");

    await InventoryAdjustment.create(validatedData);
    return product?.get({ plain: true });
  }
}
