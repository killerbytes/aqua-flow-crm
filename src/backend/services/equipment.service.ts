import { PAGINATION } from "@/lib/definitions";
import { Customer, EquipmentLog, ProductInventory } from "../models";
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

      // include: [
      //   {
      //     model: Customer,
      //     as: "customer",
      //   },
      // ],
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
    const validated = EquipmentLogSchema.parse(input);
    const log = await EquipmentLog.create({
      customerId: validated.customerId,
      productId: validated.productId,
      actionType: validated.actionType,
      quantity: validated.quantity,
      notes: validated.notes,
      loggedBy: loggedByUserId || 1,
    } as any);

    return log.get({ plain: true });
  }

  // Alias for compatibility
  static getEquipmentLogs = EquipmentService.getAll;
}
