import {
  CustomerStatus,
  EquipmentActionType,
  LedgerAccountType,
  LedgerReferenceType,
  PAGINATION,
} from "@/lib/definitions";
import { toPagination } from "@/lib/pagination";
import { Op, Transaction } from "sequelize";
import {
  Customer,
  CustomerEquipmentBalance,
  EquipmentLedgerEntry,
  Order,
  ProductInventory,
  sequelize,
  User,
} from "../models";
import { EquipmentLogFormData, EquipmentLogSchema } from "../schemas/zodSchemas";

export interface EquipmentLogQueryParams {
  limit?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC";
  query?: {
    customerId?: number;
    productId?: number;
    actionType?: string;
  };
}

type AccountPair = { from: LedgerAccountType; to: LedgerAccountType };

/** The ledger accounts each action moves containers between. */
const ACTION_ACCOUNTS: Record<EquipmentActionType, AccountPair> = {
  [EquipmentActionType.ISSUE]: {
    from: LedgerAccountType.STATION,
    to: LedgerAccountType.CUSTOMER,
  },
  [EquipmentActionType.RETURNED]: {
    from: LedgerAccountType.CUSTOMER,
    to: LedgerAccountType.STATION,
  },
  [EquipmentActionType.LOST]: {
    from: LedgerAccountType.CUSTOMER,
    to: LedgerAccountType.SCRAP_LOST,
  },
  [EquipmentActionType.DAMAGED]: {
    from: LedgerAccountType.CUSTOMER,
    to: LedgerAccountType.SCRAP_DAMAGED,
  },
  [EquipmentActionType.TEMPORARY]: {
    from: LedgerAccountType.STATION,
    to: LedgerAccountType.CUSTOMER_TEMP,
  },
  [EquipmentActionType.TEMPORARY_RETURNED]: {
    from: LedgerAccountType.CUSTOMER_TEMP,
    to: LedgerAccountType.STATION,
  },
  [EquipmentActionType.TEMPORARY_LOST]: {
    from: LedgerAccountType.CUSTOMER_TEMP,
    to: LedgerAccountType.SCRAP_LOST,
  },
  [EquipmentActionType.TEMPORARY_DAMAGED]: {
    from: LedgerAccountType.CUSTOMER_TEMP,
    to: LedgerAccountType.SCRAP_DAMAGED,
  },
};

const isCustomerAccount = (type: LedgerAccountType) =>
  type === LedgerAccountType.CUSTOMER ||
  type === LedgerAccountType.CUSTOMER_TEMP;

/**
 * The action a ledger entry shows as. Stock written off straight from the
 * station has no customer action, so it reads as plain lost or damaged.
 */
const actionOf = (entry: {
  fromAccountType: string;
  toAccountType: string;
  referenceType?: string | null;
}): string => {
  const match = Object.entries(ACTION_ACCOUNTS).find(
    ([, pair]) =>
      pair.from === entry.fromAccountType && pair.to === entry.toAccountType,
  );
  if (match) return match[0];
  if (entry.toAccountType === LedgerAccountType.SCRAP_LOST) {
    return EquipmentActionType.LOST;
  }
  if (entry.toAccountType === LedgerAccountType.SCRAP_DAMAGED) {
    return EquipmentActionType.DAMAGED;
  }
  return entry.referenceType || "LEDGER";
};

export class EquipmentService {
  static async getAll(params: EquipmentLogQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      query = {},
    } = params;

    const where: any = {};
    if (query.customerId) {
      where[Op.or] = [
        { fromAccountId: query.customerId },
        { toAccountId: query.customerId },
      ];
    }
    if (query.productId) where.productId = query.productId;

    const offset = (page - 1) * limit;

    const { rows, count } = await EquipmentLedgerEntry.findAndCountAll({
      offset,
      limit,
      where,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Customer, as: "customer", paranoid: false },
        { model: ProductInventory, as: "product", paranoid: false },
        { model: User, as: "user", paranoid: false },
      ],
    });

    return {
      rows: rows.map((r) => {
        const plain = r.get({ plain: true });
        return {
          ...plain,
          logId: plain.entryId,
          actionType: actionOf(plain),
          customerId: plain.toAccountId || plain.fromAccountId,
        };
      }),
      pagination: toPagination(count, limit, page),
    };
  }

  static async logEquipment(input: any, loggedByUserId: number) {
    const validatedData = EquipmentLogSchema.parse(input);
    return await sequelize.transaction((t) =>
      EquipmentService.recordEquipmentAction(validatedData, loggedByUserId, t),
    );
  }

  private static async recordEquipmentAction(
    validatedData: EquipmentLogFormData,
    loggedByUserId: number,
    t: Transaction,
  ) {
    const { customerId, productId, actionType, quantity, notes } =
      validatedData;

    // Locked so simultaneous actions on a product can't overdraw its stock.
    const product = await ProductInventory.findByPk(productId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) {
      throw new Error("Product not found");
    }

    // Locked so the customer can't be deleted while this is being recorded,
    // and so setting them inactive waits for this to finish.
    const customer = await Customer.findByPk(customerId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!customer) {
      throw new Error("Customer not found");
    }

    const isGiving =
      actionType === EquipmentActionType.ISSUE ||
      actionType === EquipmentActionType.TEMPORARY;

    // Inactive customers drop out of the reports that chase equipment, so
    // nothing new goes out to them. Returns, losses, and damage stay allowed
    // so anything already out can still be closed.
    if (isGiving && customer.status === CustomerStatus.INACTIVE) {
      throw new Error(
        "Can't give equipment to an inactive customer. Set them active first.",
      );
    }

    if (isGiving) {
      if (quantity > product.stockInStation) {
        if (actionType === EquipmentActionType.ISSUE) {
          throw new Error(
            `Cannot issue ${quantity} container(s). Only ${product.stockInStation} available in station.`,
          );
        } else {
          throw new Error(
            `Cannot process ${quantity} temporary container(s). Only ${product.stockInStation} available in station.`,
          );
        }
      }
    }

    const isTemporaryAction =
      actionType === EquipmentActionType.TEMPORARY_RETURNED ||
      actionType === EquipmentActionType.TEMPORARY_LOST ||
      actionType === EquipmentActionType.TEMPORARY_DAMAGED;

    const isRegularReduceAction =
      actionType === EquipmentActionType.RETURNED ||
      actionType === EquipmentActionType.LOST ||
      actionType === EquipmentActionType.DAMAGED;

    if (isTemporaryAction || isRegularReduceAction) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId, productId },
        transaction: t,
      });

      if (isTemporaryAction) {
        const currentTemp = balance?.quantityTemporaryOwed ?? 0;
        if (quantity > currentTemp) {
          if (actionType === EquipmentActionType.TEMPORARY_RETURNED) {
            throw new Error(
              `Cannot return ${quantity} temporary container(s). Customer only has ${currentTemp} temporary container(s) borrowed.`,
            );
          }
          throw new Error(
            `Cannot process ${quantity} temporary container(s) as ${actionType}. Customer only has ${currentTemp} temporary container(s) borrowed.`,
          );
        }
      } else if (isRegularReduceAction) {
        const currentOwed = balance?.quantityOwed ?? 0;
        if (quantity > currentOwed) {
          if (actionType === EquipmentActionType.RETURNED) {
            throw new Error(
              `Cannot return ${quantity} container(s). Customer only owes ${currentOwed} container(s).`,
            );
          }
          throw new Error(
            `Cannot process ${quantity} container(s) as ${actionType}. Customer only owes ${currentOwed} container(s).`,
          );
        }
      }
    }

    const { from: fromAccountType, to: toAccountType } =
      ACTION_ACCOUNTS[actionType];
    const fromAccountId = isCustomerAccount(fromAccountType) ? customerId : null;
    const toAccountId = isCustomerAccount(toAccountType) ? customerId : null;

    const entry = await EquipmentLedgerEntry.create(
      {
        productId,
        fromAccountType,
        fromAccountId,
        toAccountType,
        toAccountId,
        quantity,
        referenceType: LedgerReferenceType.MANUAL_LOG,
        notes,
        loggedBy: loggedByUserId,
      },
      { transaction: t },
    );

    const plain = entry.get({ plain: true });
    return {
      ...plain,
      logId: entry.entryId,
    };
  }

  // --- Pattern 1 Reports & Audits ---

  /**
   * 1. System Inventory Balance Sheet Report
   * Aggregates current total equipment inventory across all account nodes.
   */
  static async getBalanceSheetReport() {
    const products = await ProductInventory.findAll();
    const report = [];

    for (const prod of products) {
      const entries = await EquipmentLedgerEntry.findAll({
        where: { productId: prod.productId },
      });

      let stationStock = 0;
      let customerOwed = 0;
      let customerTemp = 0;
      let scrapDamaged = 0;
      let scrapLost = 0;
      let totalProcured = 0;

      for (const e of entries) {
        if (e.toAccountType === LedgerAccountType.STATION)
          stationStock += e.quantity;
        if (e.fromAccountType === LedgerAccountType.STATION)
          stationStock -= e.quantity;

        if (e.toAccountType === LedgerAccountType.CUSTOMER)
          customerOwed += e.quantity;
        if (e.fromAccountType === LedgerAccountType.CUSTOMER)
          customerOwed -= e.quantity;

        if (e.toAccountType === LedgerAccountType.CUSTOMER_TEMP)
          customerTemp += e.quantity;
        if (e.fromAccountType === LedgerAccountType.CUSTOMER_TEMP)
          customerTemp -= e.quantity;

        if (e.toAccountType === LedgerAccountType.SCRAP_DAMAGED)
          scrapDamaged += e.quantity;
        if (e.toAccountType === LedgerAccountType.SCRAP_LOST)
          scrapLost += e.quantity;

        if (e.fromAccountType === LedgerAccountType.SUPPLIER)
          totalProcured += e.quantity;
      }

      // The stored totals are what the app shows. The ledger is the record of
      // every movement, so any difference means the totals have drifted.
      const ledger = {
        stationStock,
        customerOwed: customerOwed + customerTemp,
        scrapDamaged,
        scrapLost,
      };
      const matchesLedger =
        ledger.stationStock === prod.stockInStation &&
        ledger.customerOwed === prod.stockWithCustomers &&
        ledger.scrapDamaged === prod.stockDamaged &&
        ledger.scrapLost === prod.stockLost;

      report.push({
        productId: prod.productId,
        productName: prod.name,
        stationStock: prod.stockInStation,
        customerOwed: prod.stockWithCustomers,
        scrapDamaged: prod.stockDamaged,
        scrapLost: prod.stockLost,
        totalFleet:
          prod.stockInStation +
          prod.stockWithCustomers +
          prod.stockDamaged +
          prod.stockLost,
        ledger,
        matchesLedger,
      });
    }

    return report;
  }

  /**
   * 2. Customer Container Liability Aging Report
   * Lists customers holding container debt and calculates aging days since last movement.
   */
  static async getCustomerLiabilityAgingReport() {
    const balances = await CustomerEquipmentBalance.findAll({
      where: {
        [Op.or]: [
          { quantityOwed: { [Op.gt]: 0 } },
          { quantityTemporaryOwed: { [Op.gt]: 0 } },
        ],
      },
      include: [
        { model: Customer, as: "customer", paranoid: false },
        { model: ProductInventory, as: "product", paranoid: false },
      ],
    });

    const report = [];
    for (const b of balances) {
      const plain = b.get({ plain: true });
      const lastEntry = await EquipmentLedgerEntry.findOne({
        where: {
          productId: b.productId,
          [Op.or]: [
            { fromAccountId: b.customerId },
            { toAccountId: b.customerId },
          ],
        },
        order: [["createdAt", "DESC"]],
      });

      const lastOrder = await Order.findOne({
        where: { customerId: b.customerId },
        order: [["createdAt", "DESC"]],
      });

      const ledgerTime = lastEntry?.createdAt
        ? new Date(lastEntry.createdAt).getTime()
        : 0;
      const orderTime = lastOrder?.createdAt
        ? new Date(lastOrder.createdAt).getTime()
        : 0;
      const balanceTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

      const maxTime = Math.max(ledgerTime, orderTime, balanceTime);
      const lastDate = maxTime > 0 ? new Date(maxTime) : b.updatedAt;

      const daysIdle = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      report.push({
        customerId: b.customerId,
        productId: b.productId,
        customerName: plain.customer?.name || "Unknown",
        productName: plain.product?.name || "Unknown",
        quantityOwed: b.quantityOwed,
        quantityTemporaryOwed: b.quantityTemporaryOwed,
        totalHoldings: b.quantityOwed + b.quantityTemporaryOwed,
        lastActivityDate: lastDate,
        lastOrderDate: lastOrder?.createdAt || null,
        daysIdle: Math.max(0, daysIdle),
      });
    }

    return report;
  }

  /**
   * 3. Container Loss & Shrinkage Rate Report
   * Calculates total lost/damaged containers and shrinkage percentage over total movements.
   */
  static async getShrinkageRateReport() {
    const products = await ProductInventory.findAll();
    const report = [];

    for (const prod of products) {
      const lostEntries = await EquipmentLedgerEntry.sum("quantity", {
        where: {
          productId: prod.productId,
          toAccountType: LedgerAccountType.SCRAP_LOST,
        },
      });

      const damagedEntries = await EquipmentLedgerEntry.sum("quantity", {
        where: {
          productId: prod.productId,
          toAccountType: LedgerAccountType.SCRAP_DAMAGED,
        },
      });

      const totalIssued = await EquipmentLedgerEntry.sum("quantity", {
        where: {
          productId: prod.productId,
          toAccountType: {
            [Op.in]: [
              LedgerAccountType.CUSTOMER,
              LedgerAccountType.CUSTOMER_TEMP,
            ],
          },
        },
      });

      const totalScrap = (lostEntries || 0) + (damagedEntries || 0);
      const totalMovements = (totalIssued || 0) + totalScrap;
      const shrinkageRate =
        totalMovements > 0
          ? Number(((totalScrap / totalMovements) * 100).toFixed(2))
          : 0;

      report.push({
        productId: prod.productId,
        productName: prod.name,
        unitsLost: prod.stockLost || lostEntries || 0,
        unitsDamaged: prod.stockDamaged || damagedEntries || 0,
        totalScrap: prod.stockLost + prod.stockDamaged,
        shrinkagePercentage: shrinkageRate,
      });
    }

    return report;
  }
}
