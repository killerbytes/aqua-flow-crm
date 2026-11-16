import { businessDaysBetween } from "@/lib/business-time";
import {
  CustomerStatus,
  LedgerAccountType,
  OrderStatus,
} from "@/lib/definitions";
import { col, fn, Op } from "sequelize";
import {
  Customer,
  CustomerEquipmentBalance,
  EquipmentLedgerEntry,
  Order,
  ProductInventory,
} from "../models";
import { WALK_IN_CUSTOMER_NAME } from "./customer.service";

/** How long without an order before a customer shows as inactive, by default. */
export const DEFAULT_INACTIVE_DAYS = 30;

export interface InactiveCustomerRow {
  customerId: number;
  customerName: string;
  phone: string | null;
  address: string | null;
  customerSince: Date;
  /** Null when the customer has never ordered. */
  lastOrderAt: Date | null;
  daysSinceLastOrder: number | null;
}

export interface HeldEquipment {
  productId: number;
  productName: string;
  quantity: number;
}

export interface InactiveCustomerWithEquipmentRow extends InactiveCustomerRow {
  equipment: HeldEquipment[];
  totalHeld: number;
}

export interface TemporaryEquipmentRow {
  customerId: number;
  customerName: string;
  phone: string | null;
  productId: number;
  productName: string;
  quantity: number;
  /** When the oldest unit still out was lent. Null if the ledger has no record of it. */
  givenAt: Date | null;
  daysHeld: number | null;
}

export interface InactiveCustomersParams {
  minDays?: number;
  now?: Date;
}

/** Turns a `days` search param into a whole number of days, or the default. */
export const parseMinDays = (value: unknown) => {
  const days = Number(Array.isArray(value) ? value[0] : value);
  return value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isInteger(days) &&
    days >= 0
    ? days
    : DEFAULT_INACTIVE_DAYS;
};

/** SQLite hands back aggregated timestamps as strings, PostgreSQL as dates. */
const toDate = (value: unknown) =>
  value instanceof Date ? value : new Date(String(value));

/**
 * Newest order date per customer, worked out in the database. Cancelled orders,
 * voided ones included, don't count as ordering.
 */
async function lastOrderDates() {
  const attributes = Order.getAttributes();
  const rows = (await Order.findAll({
    attributes: [
      "customerId",
      [fn("MAX", col(attributes.createdAt.field!)), "lastOrderAt"],
    ],
    where: { status: { [Op.ne]: OrderStatus.CANCELLED } },
    group: [col(attributes.customerId.field!)],
    raw: true,
  })) as unknown as { customerId: number; lastOrderAt: unknown }[];

  return new Map(
    rows.map((row) => [Number(row.customerId), toDate(row.lastOrderAt)]),
  );
}

export class ReportService {
  /**
   * Active customers with no order in at least `minDays` Philippine calendar
   * days, longest idle first, then customers who have never ordered. The
   * walk-in account isn't a customer, so it never appears.
   */
  static async getInactiveCustomers({
    minDays = DEFAULT_INACTIVE_DAYS,
    now = new Date(),
  }: InactiveCustomersParams = {}): Promise<InactiveCustomerRow[]> {
    const [customers, lastOrders] = await Promise.all([
      Customer.findAll({
        attributes: ["customerId", "name", "phone", "address", "createdAt"],
        where: {
          status: CustomerStatus.ACTIVE,
          name: { [Op.ne]: WALK_IN_CUSTOMER_NAME },
        },
      }),
      lastOrderDates(),
    ]);

    const rows: InactiveCustomerRow[] = [];
    for (const customer of customers) {
      const lastOrderAt = lastOrders.get(customer.customerId) ?? null;
      const daysSinceLastOrder = lastOrderAt
        ? Math.max(0, businessDaysBetween(lastOrderAt, now))
        : null;

      if (daysSinceLastOrder !== null && daysSinceLastOrder < minDays) continue;

      rows.push({
        customerId: customer.customerId,
        customerName: customer.name,
        phone: customer.phone || null,
        address: customer.address || null,
        customerSince: customer.createdAt,
        lastOrderAt,
        daysSinceLastOrder,
      });
    }

    return rows.sort((a, b) => {
      if (a.daysSinceLastOrder === null && b.daysSinceLastOrder === null) {
        return a.customerName.localeCompare(b.customerName);
      }
      if (a.daysSinceLastOrder === null) return 1;
      if (b.daysSinceLastOrder === null) return -1;
      return (
        b.daysSinceLastOrder - a.daysSinceLastOrder ||
        a.customerName.localeCompare(b.customerName)
      );
    });
  }

  /**
   * Inactive customers, by the same rule as getInactiveCustomers, who still
   * hold regular equipment. Temporary equipment has its own report.
   */
  static async getInactiveCustomersWithEquipment(
    params: InactiveCustomersParams = {},
  ): Promise<InactiveCustomerWithEquipmentRow[]> {
    const [inactive, balances] = await Promise.all([
      ReportService.getInactiveCustomers(params),
      CustomerEquipmentBalance.findAll({
        where: { quantityOwed: { [Op.gt]: 0 } },
        include: [
          {
            model: ProductInventory,
            as: "product",
            attributes: ["productId", "name"],
            paranoid: false,
          },
        ],
        order: [["productId", "ASC"]],
      }),
    ]);

    const held = new Map<number, HeldEquipment[]>();
    for (const balance of balances) {
      const list = held.get(balance.customerId) ?? [];
      list.push({
        productId: balance.productId,
        productName: balance.product?.name ?? "Unknown product",
        quantity: balance.quantityOwed,
      });
      held.set(balance.customerId, list);
    }

    return inactive.flatMap((row) => {
      const equipment = held.get(row.customerId);
      if (!equipment) return [];
      return [
        {
          ...row,
          equipment,
          totalHeld: equipment.reduce((sum, item) => sum + item.quantity, 0),
        },
      ];
    });
  }

  /**
   * Every customer holding temporary equipment, longest held first. The date
   * given is that of the oldest unit still out, reading the ledger first in,
   * first out: returned, lost, or damaged units close the oldest loans first.
   */
  static async getTemporaryEquipment({
    now = new Date(),
  }: { now?: Date } = {}): Promise<TemporaryEquipmentRow[]> {
    const balances = await CustomerEquipmentBalance.findAll({
      where: { quantityTemporaryOwed: { [Op.gt]: 0 } },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["customerId", "name", "phone"],
          paranoid: false,
        },
        {
          model: ProductInventory,
          as: "product",
          attributes: ["productId", "name"],
          paranoid: false,
        },
      ],
    });
    if (balances.length === 0) return [];

    const entries = await EquipmentLedgerEntry.findAll({
      attributes: [
        "productId",
        "fromAccountType",
        "fromAccountId",
        "toAccountType",
        "toAccountId",
        "quantity",
        "createdAt",
      ],
      where: {
        productId: { [Op.in]: [...new Set(balances.map((b) => b.productId))] },
        [Op.or]: [
          { toAccountType: LedgerAccountType.CUSTOMER_TEMP },
          { fromAccountType: LedgerAccountType.CUSTOMER_TEMP },
        ],
      },
      order: [
        ["createdAt", "ASC"],
        ["entryId", "ASC"],
      ],
    });

    // Loans still open per customer and product, oldest first.
    const loans = new Map<string, { quantity: number; givenAt: Date }[]>();
    for (const entry of entries) {
      if (
        entry.toAccountType === LedgerAccountType.CUSTOMER_TEMP &&
        entry.toAccountId
      ) {
        const key = `${entry.toAccountId}:${entry.productId}`;
        const open = loans.get(key) ?? [];
        open.push({ quantity: entry.quantity, givenAt: entry.createdAt });
        loans.set(key, open);
      }
      if (
        entry.fromAccountType === LedgerAccountType.CUSTOMER_TEMP &&
        entry.fromAccountId
      ) {
        const open = loans.get(`${entry.fromAccountId}:${entry.productId}`);
        let remaining = entry.quantity;
        while (open?.length && remaining > 0) {
          const taken = Math.min(open[0].quantity, remaining);
          open[0].quantity -= taken;
          remaining -= taken;
          if (open[0].quantity === 0) open.shift();
        }
      }
    }

    const rows = balances.map((balance) => {
      const givenAt =
        loans.get(`${balance.customerId}:${balance.productId}`)?.[0]?.givenAt ??
        null;
      return {
        customerId: balance.customerId,
        customerName: balance.customer?.name ?? "Unknown customer",
        phone: balance.customer?.phone || null,
        productId: balance.productId,
        productName: balance.product?.name ?? "Unknown product",
        quantity: balance.quantityTemporaryOwed,
        givenAt,
        daysHeld: givenAt
          ? Math.max(0, businessDaysBetween(givenAt, now))
          : null,
      };
    });

    return rows.sort(
      (a, b) =>
        (b.daysHeld ?? -1) - (a.daysHeld ?? -1) ||
        a.customerName.localeCompare(b.customerName) ||
        a.productName.localeCompare(b.productName),
    );
  }
}
