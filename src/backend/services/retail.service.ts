import { toPlain } from "../models/plain";
import {
  CustomerStatus,
  PAGINATION,
  RETAIL_STOCK_ENTRY_LABELS,
  RetailStockEntryType,
} from "@/lib/definitions";
import { fromCents, toCents } from "@/lib/money";
import { toPagination } from "@/lib/pagination";
import { Attributes, col, fn, Op, WhereOptions } from "sequelize";
import {
  Customer,
  RetailProduct,
  RetailSale,
  RetailSaleItem,
  RetailStockEntry,
  sequelize,
  User,
} from "../models";
import {
  RetailProductSchema,
  RetailSaleSchema,
  RetailStockAdjustmentSchema,
  VoidRetailSaleSchema,
} from "../schemas/zodSchemas";
import { CustomerService } from "./customer.service";
import { handleServiceError } from "./errorHandler";
import type { DateRange } from "./finance-report.service";

// Stock must add up to the stock entries, so it only changes through them.
// Refusing, rather than ignoring, makes a caller's mistake visible.
const rejectStockFields = (input: unknown) => {
  if (typeof input !== "object" || input === null) return;
  const fields: Record<string, unknown> = { ...input };
  if (fields.stockOnHand !== undefined) {
    throw new Error(
      "Stock can only be changed with a restock or write-off, so it's recorded in the stock log",
    );
  }
};

/** What a sale is shown with: who bought it, who sold and voided it, its lines. */
const SALE_INCLUDES = [
  { model: Customer, as: "customer", paranoid: false },
  { model: User, as: "soldByUser", paranoid: false },
  { model: User, as: "voidedByUser", paranoid: false },
  {
    model: RetailSaleItem,
    as: "items",
    include: [{ model: RetailProduct, as: "product" }],
  },
];

/** One quantity per product, in product order, which is the order to lock in. */
const mergeLines = (items: { productId: number; quantity: number }[]) => {
  const quantities = new Map<number, number>();
  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return [...quantities]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId - b.productId);
};

const sumCents = (amounts: number[]) =>
  amounts.reduce((total, amount) => total + toCents(amount), 0);

export interface RetailSaleQueryParams {
  limit?: number;
  page?: number;
  query?: {
    customerId?: number;
    /** Sales from this instant on. */
    start?: Date;
    /** Sales before this instant. */
    end?: Date;
  };
}

// ---------------------------------------------------------------------------
// Stock report rows
// ---------------------------------------------------------------------------

export interface RetailStockRow {
  /** Null on the totals row. */
  productId: number | null;
  productName: string;
  /** Units in stock when the range began. */
  opening: number;
  restocked: number;
  sold: number;
  /** Units back in stock from voided sales. */
  returned: number;
  writtenOff: number;
  /** Units in stock when the range ended. */
  closing: number;
  /** The stored count today. */
  onHandNow: number;
  /** Whether the stored count equals what every entry adds up to. */
  matchesEntries: boolean;
}

export interface RetailStockLogRow {
  at: Date;
  productName: string;
  type: string;
  change: number;
  reference: string | null;
  by: string;
  notes: string | null;
}

export interface RetailStockReport {
  range: DateRange;
  rows: RetailStockRow[];
  total: RetailStockRow;
  log: RetailStockLogRow[];
}

/**
 * Units moved per product and entry type, summed in the database rather than
 * by loading every entry.
 */
const stockFlows = async (where: WhereOptions<Attributes<RetailStockEntry>>) => {
  const fields = RetailStockEntry.getAttributes();
  const rows = (await RetailStockEntry.findAll({
    attributes: [
      "productId",
      "type",
      [fn("SUM", col(fields.quantityChange.field!)), "quantity"],
    ],
    where,
    group: [col(fields.productId.field!), col(fields.type.field!)],
    raw: true,
  })) as unknown as {
    productId: number;
    type: RetailStockEntryType;
    quantity: number | string;
  }[];

  // PostgreSQL returns SUM of an integer column as a string.
  return rows.map((row) => ({
    productId: Number(row.productId),
    type: row.type,
    quantity: Number(row.quantity),
  }));
};

type Flow = Awaited<ReturnType<typeof stockFlows>>[number];

const flowOf = (
  flows: Flow[],
  productId: number,
  type?: RetailStockEntryType,
) =>
  flows
    .filter((f) => f.productId === productId && (!type || f.type === type))
    .reduce((sum, f) => sum + f.quantity, 0);

// ---------------------------------------------------------------------------
// Products and stock
// ---------------------------------------------------------------------------

export class RetailProductService {
  static async getAll() {
    const products = await RetailProduct.findAll({
      order: [["productId", "ASC"]],
    });
    return products.map((p) => toPlain(p));
  }

  static async get(id: number | string) {
    const product = await RetailProduct.findByPk(Number(id));
    return product ? toPlain(product) : undefined;
  }

  /** A new product starts with no stock; restock it to add some. */
  static async create(input: unknown) {
    rejectStockFields(input);
    const data = RetailProductSchema.parse(input);
    try {
      return toPlain(await RetailProduct.create(data));
    } catch (error) {
      handleServiceError(error);
    }
  }

  /** Changes the name, base price, or low stock warning. Past sales keep their price. */
  static async update(id: number | string, input: unknown) {
    rejectStockFields(input);
    const data = RetailProductSchema.partial().parse(input);
    const product = await RetailProduct.findByPk(Number(id));
    if (!product) throw new Error("Product not found");

    try {
      await product.update(data);
      return toPlain(product);
    } catch (error) {
      handleServiceError(error);
    }
  }

  /** A restock adds units; a write-off takes away damaged or lost ones. */
  static async adjustStock(input: unknown, loggedBy: number) {
    const { productId, type, quantity, notes } =
      RetailStockAdjustmentSchema.parse(input);

    return await sequelize.transaction(async (t) => {
      // Locked so a sale can't take the units this writes off.
      const product = await RetailProduct.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!product) throw new Error("Product not found");

      if (
        type === RetailStockEntryType.WRITE_OFF &&
        quantity > product.stockOnHand
      ) {
        throw new Error(
          `Can't write off ${quantity}. Only ${product.stockOnHand} ${product.name} in stock.`,
        );
      }

      const entry = await RetailStockEntry.create(
        {
          productId,
          type,
          quantityChange:
            type === RetailStockEntryType.RESTOCK ? quantity : -quantity,
          notes: notes?.trim() || null,
          loggedBy,
        },
        { transaction: t },
      );
      return toPlain(entry);
    });
  }

  /** The latest stock movements, newest first. */
  static async getStockEntries({ limit = 25 }: { limit?: number } = {}) {
    const entries = await RetailStockEntry.findAll({
      include: [
        { model: RetailProduct, as: "product" },
        { model: User, as: "user", paranoid: false },
      ],
      order: [
        ["createdAt", "DESC"],
        ["entryId", "DESC"],
      ],
      limit,
    });
    return entries.map((e) => toPlain(e));
  }

  /**
   * Each product's stock across a range of Philippine days: what it started
   * with, what came in and went out, and what it ended with, worked out from
   * the stock entries. The stored count today is checked against all of them.
   * The log lists every movement in the range, oldest first.
   */
  static async getStockReport(range: DateRange): Promise<RetailStockReport> {
    const inRange = { [Op.gte]: range.start, [Op.lt]: range.end };

    const [products, before, during, all, entries] = await Promise.all([
      RetailProduct.findAll({ order: [["productId", "ASC"]] }),
      stockFlows({ createdAt: { [Op.lt]: range.start } }),
      stockFlows({ createdAt: inRange }),
      stockFlows({}),
      RetailStockEntry.findAll({
        where: { createdAt: inRange },
        include: [
          { model: RetailProduct, as: "product" },
          { model: User, as: "user", paranoid: false },
        ],
        order: [
          ["createdAt", "ASC"],
          ["entryId", "ASC"],
        ],
      }),
    ]);

    const rows: RetailStockRow[] = products.map((product) => {
      const id = product.productId;
      const opening = flowOf(before, id);
      return {
        productId: id,
        productName: product.name,
        opening,
        restocked: flowOf(during, id, RetailStockEntryType.RESTOCK),
        sold: -flowOf(during, id, RetailStockEntryType.SALE),
        returned: flowOf(during, id, RetailStockEntryType.SALE_VOID),
        writtenOff: -flowOf(during, id, RetailStockEntryType.WRITE_OFF),
        closing: opening + flowOf(during, id),
        onHandNow: product.stockOnHand,
        matchesEntries: flowOf(all, id) === product.stockOnHand,
      };
    });

    const sum = (pick: (row: RetailStockRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);

    return {
      range,
      rows,
      total: {
        productId: null,
        productName: "Total",
        opening: sum((r) => r.opening),
        restocked: sum((r) => r.restocked),
        sold: sum((r) => r.sold),
        returned: sum((r) => r.returned),
        writtenOff: sum((r) => r.writtenOff),
        closing: sum((r) => r.closing),
        onHandNow: sum((r) => r.onHandNow),
        matchesEntries: rows.every((r) => r.matchesEntries),
      },
      log: entries.map((entry) => ({
        at: entry.createdAt,
        productName: entry.product?.name ?? "Unknown product",
        type: RETAIL_STOCK_ENTRY_LABELS[entry.type] ?? entry.type,
        change: entry.quantityChange,
        reference: entry.saleId ? `Retail sale #${entry.saleId}` : null,
        by: entry.user?.name ?? "Not recorded",
        notes: entry.notes,
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export class RetailSaleService {
  static async get(id: number | string) {
    const sale = await RetailSale.findByPk(Number(id), {
      include: SALE_INCLUDES,
      order: [[{ model: RetailSaleItem, as: "items" }, "itemId", "ASC"]],
    });
    return sale ? toPlain(sale) : null;
  }

  /**
   * Sales newest first, with what the ones that stand add up to. Voided sales
   * stay in the list, marked, but count in none of the totals.
   */
  static async getAll(params: RetailSaleQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      query = {},
    } = params;

    const soldAt: { [Op.gte]?: Date; [Op.lt]?: Date } = {};
    if (query.start) soldAt[Op.gte] = query.start;
    if (query.end) soldAt[Op.lt] = query.end;
    const where: WhereOptions<Attributes<RetailSale>> = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.start || query.end ? { soldAt } : {}),
    };

    const [{ rows, count }, standing] = await Promise.all([
      RetailSale.findAndCountAll({
        where,
        include: SALE_INCLUDES,
        order: [
          ["soldAt", "DESC"],
          ["saleId", "DESC"],
        ],
        limit,
        offset: (page - 1) * limit,
        distinct: true,
      }),
      RetailSale.findAll({
        attributes: ["totalAmount", "discount"],
        where: { ...where, voidedAt: null },
      }),
    ]);

    return {
      rows: rows.map((r) => toPlain(r)),
      pagination: toPagination(count, limit, page),
      summary: {
        sales: standing.length,
        total: fromCents(sumCents(standing.map((s) => s.totalAmount))),
        discounts: fromCents(sumCents(standing.map((s) => s.discount))),
      },
    };
  }

  /**
   * Records a sale paid in full now. Lines are priced from each product's base
   * price in the database; the discount, a peso amount off the bill, is the
   * one amount staff set and can't be more than the subtotal. The units sold
   * leave stock in the same transaction, and a sale is refused when there
   * aren't enough. Without a customer it goes on the walk-in account.
   */
  static async create(input: unknown, soldBy: number) {
    const data = RetailSaleSchema.parse(input);
    const lines = mergeLines(data.items);
    const customerId =
      data.customerId ?? (await CustomerService.getOrCreateWalkIn()).customerId;

    const saleId = await sequelize.transaction(async (t) => {
      const customer = await Customer.findByPk(customerId, { transaction: t });
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }
      if (customer.status === CustomerStatus.INACTIVE) {
        throw new Error(
          "Can't sell to an inactive customer. Set them active first.",
        );
      }

      // Each product is locked before its stock is checked, in product order,
      // so two sales of the same products can't deadlock or both take the
      // last unit.
      let subtotalCents = 0;
      const priced: { productId: number; quantity: number; unitPrice: number }[] =
        [];
      for (const line of lines) {
        const product = await RetailProduct.findByPk(line.productId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!product) {
          throw new Error(`Product with ID ${line.productId} not found`);
        }
        if (product.stockOnHand < line.quantity) {
          throw new Error(
            `Only ${product.stockOnHand} ${product.name} left in stock`,
          );
        }
        subtotalCents += toCents(product.basePrice) * line.quantity;
        priced.push({ ...line, unitPrice: product.basePrice });
      }

      const discountCents = toCents(data.discount);
      if (discountCents > subtotalCents) {
        throw new Error("The discount can't be more than the subtotal");
      }

      const sale = await RetailSale.create(
        {
          customerId,
          subtotal: fromCents(subtotalCents),
          discount: fromCents(discountCents),
          totalAmount: fromCents(subtotalCents - discountCents),
          paymentMethod: data.paymentMethod,
          paymentNotes: data.paymentNotes?.trim() || null,
          soldAt: new Date(),
          soldBy,
        },
        { transaction: t },
      );

      await RetailSaleItem.bulkCreate(
        priced.map((line) => ({ ...line, saleId: sale.saleId })),
        { transaction: t },
      );
      // One at a time, as bulkCreate would skip the hook that moves the stock.
      for (const line of priced) {
        await RetailStockEntry.create(
          {
            productId: line.productId,
            type: RetailStockEntryType.SALE,
            quantityChange: -line.quantity,
            saleId: sale.saleId,
            notes: null,
            loggedBy: soldBy,
          },
          { transaction: t },
        );
      }

      return sale.saleId;
    });

    return (await RetailSaleService.get(saleId))!;
  }

  /**
   * Voids a sale entered by mistake or refunded. It stays on record with who
   * voided it, when, and why, and its units go back into stock. Its payment is
   * on the sale itself, so it no longer counts as money taken in either.
   */
  static async voidSale(id: number | string, input: unknown, userId: number) {
    const { reason } = VoidRetailSaleSchema.parse(input);

    await sequelize.transaction(async (t) => {
      // The lock stops the same sale being voided twice at once.
      const sale = await RetailSale.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!sale) throw new Error(`Retail sale #${id} not found`);
      if (sale.voidedAt) throw new Error("This sale has already been voided");

      await sale.update(
        { voidedAt: new Date(), voidedBy: userId, voidReason: reason },
        { transaction: t },
      );

      const items = await RetailSaleItem.findAll({
        where: { saleId: sale.saleId },
        order: [["productId", "ASC"]],
        transaction: t,
      });
      for (const item of items) {
        await RetailStockEntry.create(
          {
            productId: item.productId,
            type: RetailStockEntryType.SALE_VOID,
            quantityChange: item.quantity,
            saleId: sale.saleId,
            notes: reason,
            loggedBy: userId,
          },
          { transaction: t },
        );
      }
    });

    return (await RetailSaleService.get(id))!;
  }
}

/** A page of retail sales, with its totals. */
export type RetailSalePage = Awaited<ReturnType<typeof RetailSaleService.getAll>>;
