import {
  InventoryAdjustmentType,
  LedgerAccountType,
  LedgerReferenceType,
  PAGINATION,
} from "@/lib/definitions";
import { handleServiceError } from "./errorHandler";
import { EquipmentLedgerEntry, ProductInventory } from "../models";
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
    if (query.productId) where.productId = query.productId;

    const offset = (page - 1) * limit;

    const { rows, count } = await EquipmentLedgerEntry.findAndCountAll({
      offset,
      limit,
      where: {
        ...where,
        referenceType: [
          LedgerReferenceType.INVENTORY_ADJUSTMENT,
          LedgerReferenceType.RESTOCK,
        ],
      },
      include: [{ model: ProductInventory, as: "product" }],
      order: [["createdAt", "DESC"]],
    });

    return {
      rows: rows.map((r) => {
        const plain = r.get({ plain: true });
        let mappedType: InventoryAdjustmentType = InventoryAdjustmentType.STOCK_IN;
        if (plain.toAccountType === LedgerAccountType.SCRAP_DAMAGED) {
          mappedType = InventoryAdjustmentType.DECLARED_DAMAGED;
        } else if (plain.toAccountType === LedgerAccountType.SCRAP_LOST) {
          mappedType = InventoryAdjustmentType.DECLARED_LOST;
        }

        return {
          ...plain,
          adjustmentId: plain.entryId,
          adjustmentType: mappedType,
          reason: plain.notes || "N/A",
        };
      }),
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

    if (
      (adjustmentType === InventoryAdjustmentType.DECLARED_DAMAGED ||
        adjustmentType === InventoryAdjustmentType.DECLARED_LOST) &&
      product.stockInStation < quantity
    ) {
      throw new Error(
        `Cannot adjust ${quantity} container(s) as ${adjustmentType}. Only ${product.stockInStation} available in station.`,
      );
    }

    try {
      let fromAccountType: LedgerAccountType = LedgerAccountType.SUPPLIER;
      let toAccountType: LedgerAccountType = LedgerAccountType.STATION;

      if (adjustmentType === InventoryAdjustmentType.DECLARED_DAMAGED) {
        fromAccountType = LedgerAccountType.STATION;
        toAccountType = LedgerAccountType.SCRAP_DAMAGED;
      } else if (adjustmentType === InventoryAdjustmentType.DECLARED_LOST) {
        fromAccountType = LedgerAccountType.STATION;
        toAccountType = LedgerAccountType.SCRAP_LOST;
      }

      const entry = await EquipmentLedgerEntry.create({
        productId,
        fromAccountType,
        toAccountType,
        quantity,
        referenceType:
          adjustmentType === InventoryAdjustmentType.STOCK_IN
            ? LedgerReferenceType.RESTOCK
            : LedgerReferenceType.INVENTORY_ADJUSTMENT,
        notes: reason,
      });

      return entry.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }
}
