import { EquipmentActionType, PAGINATION } from "@/lib/definitions";
import {
  Customer,
  CustomerEquipmentBalance,
  EquipmentLog,
  ProductInventory,
} from "../models";
import { EquipmentLogSchema } from "../schemas/zodSchemas";

export interface EquipmentLogQueryParams {
  limit?: number;
  page?: number;
  query?: {
    customerId?: number;
    productId?: number;
    actionType?: string;
  };
}

export class EquipmentService {
  static async getAll(params: EquipmentLogQueryParams = {}) {
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
    const { rows, count } = await EquipmentLog.findAndCountAll({
      offset,
      limit,
      where,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Customer, as: "customer" },
        { model: ProductInventory, as: "product" },
      ],
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

  /**
   * Log an equipment action for a customer.
   */
  static async logEquipment(input: any, loggedByUserId: number) {
    const validatedData = EquipmentLogSchema.parse(input);
    try {
      const product = await ProductInventory.findByPk(validatedData.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      if (validatedData.actionType === EquipmentActionType.ISSUE) {
        if (validatedData.quantity > product.stockInStation) {
          throw new Error(
            `Cannot issue ${validatedData.quantity} container(s). Only ${product.stockInStation} available in station.`
          );
        }
      } else if (validatedData.actionType === EquipmentActionType.TEMPORARY) {
        if (validatedData.quantity > product.stockInStation) {
          throw new Error(
            `Cannot process ${validatedData.quantity} temporary container(s). Only ${product.stockInStation} available in station.`
          );
        }
      }

      const isTemporaryAction =
        validatedData.actionType === EquipmentActionType.TEMPORARY_RETURNED ||
        validatedData.actionType === EquipmentActionType.TEMPORARY_LOST ||
        validatedData.actionType === EquipmentActionType.TEMPORARY_DAMAGED;

      const isRegularReduceAction =
        validatedData.actionType === EquipmentActionType.RETURNED ||
        validatedData.actionType === EquipmentActionType.LOST ||
        validatedData.actionType === EquipmentActionType.DAMAGED;

      if (isTemporaryAction || isRegularReduceAction) {
        const balance = await CustomerEquipmentBalance.findOne({
          where: {
            customerId: validatedData.customerId,
            productId: validatedData.productId,
          },
        });

        if (isTemporaryAction) {
          const currentTemp = balance?.quantityTemporaryOwed ?? 0;
          if (validatedData.quantity > currentTemp) {
            if (
              validatedData.actionType ===
              EquipmentActionType.TEMPORARY_RETURNED
            ) {
              throw new Error(
                `Cannot return ${validatedData.quantity} temporary container(s). Customer only has ${currentTemp} temporary container(s) borrowed.`,
              );
            }
            throw new Error(
              `Cannot process ${validatedData.quantity} temporary container(s) as ${validatedData.actionType}. Customer only has ${currentTemp} temporary container(s) borrowed.`,
            );
          }
        } else if (isRegularReduceAction) {
          const currentOwed = balance?.quantityOwed ?? 0;
          if (validatedData.quantity > currentOwed) {
            if (validatedData.actionType === EquipmentActionType.RETURNED) {
              throw new Error(
                `Cannot return ${validatedData.quantity} container(s). Customer only owes ${currentOwed} container(s).`,
              );
            }
            throw new Error(
              `Cannot process ${validatedData.quantity} container(s) as ${validatedData.actionType}. Customer only owes ${currentOwed} container(s).`,
            );
          }
        }
      }

      const log = await EquipmentLog.create({
        ...validatedData,
        loggedBy: loggedByUserId,
      });

      return log.get({ plain: true });
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
}
