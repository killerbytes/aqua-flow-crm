import { InventoryAdjustmentType, PAGINATION } from "@/lib/definitions";
import { handleServiceError, InventoryLogQueryParams } from ".";
import { InventoryAdjustment, ProductInventory } from "../models";
import { AdjustmentFormData, AdjustmentSchema } from "../schemas/zodSchemas";

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
    const { productId, adjustmentType, quantity, reason } = validatedData;

    const product = await ProductInventory.findByPk(productId);
    if (!product) throw new Error("Product not found");

    let newStock = product.stockInStation;

    if (adjustmentType === InventoryAdjustmentType.STOCK_IN) {
      newStock += quantity;
    } else if (
      adjustmentType === InventoryAdjustmentType.DECLARED_DAMAGED ||
      adjustmentType === InventoryAdjustmentType.DECLARED_LOST
    ) {
      newStock = Math.max(0, newStock - quantity);
    }

    try {
      await product.update({ stockInStation: newStock });

      const adjustment = await InventoryAdjustment.create({
        productId,
        adjustmentType,
        quantity,
        reason,
      });

      return adjustment.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }
}
