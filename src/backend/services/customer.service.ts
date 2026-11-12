import {
  CustomerStatus,
  InvoiceStatus,
  OrderStatus,
  PAGINATION,
  PaymentStatus,
} from "@/lib/definitions";
import { Op, OrderItem, Transaction } from "sequelize";
import { sequelize } from "../db/database";
import {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  Invoice,
  Order,
  ProductInventory,
} from "../models";
import {
  CustomerSchema,
  SpecialPricingFormData,
  SpecialPricingSchema,
} from "../schemas/zodSchemas";
import { handleServiceError } from "./errorHandler";

export const WALK_IN_CUSTOMER_NAME = "Walk-In / Counter Sales";

export interface CustomerQueryParams {
  limit?: number;
  page?: number;
  sort?: string;
  order?: string;
  query?: {
    withSpecialPricing?: boolean;
    withBalance?: boolean;
    withTemporaryBalanceOnly?: boolean;
    selectedBarangays?: string[];
    term?: string;
  };
}

export class CustomerService {
  static async getAll(params: CustomerQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      sort,
      order: sortOrder = "ASC",
      query = {
        withSpecialPricing: false,
        withBalance: false,
        withTemporaryBalanceOnly: false,
        selectedBarangays: [],
        term: "",
      },
    } = params;
    const {
      withSpecialPricing = false,
      withBalance = false,
      withTemporaryBalanceOnly = false,
      selectedBarangays,
      term,
    } = query || {};

    const where: any = {};
    if (selectedBarangays && selectedBarangays.length > 0) {
      where.barangayId = { [Op.in]: selectedBarangays };
    }
    if (term) {
      const searchOp =
        sequelize.getDialect() === "postgres" ? Op.iLike : Op.like;
      where.searchText = { [searchOp]: `%${term}%` };
    }

    const equipmentBalanceWhere: any = withTemporaryBalanceOnly
      ? { quantityTemporaryOwed: { [Op.gt]: 0 } }
      : undefined;

    const include: any[] = [
      {
        model: CustomerEquipmentBalance,
        required: Boolean(withTemporaryBalanceOnly || withBalance),
        where: equipmentBalanceWhere,
        include: [{ model: ProductInventory, as: "product" }],
        as: "equipmentBalances",
      },
      {
        model: CustomerSpecialPricing,
        required: Boolean(withSpecialPricing),
        include: [{ model: ProductInventory, as: "product" }],
        as: "specialPricings",
      },
    ];

    const offset = (page - 1) * limit;

    const orderByMap: Record<string, string> = {
      customerId: "customerId",
      name: "name",
      barangay: "barangayId",
      status: "status",
    };

    const orderByField =
      sort && orderByMap[sort] ? orderByMap[sort] : "customerId";
    const orderBy: OrderItem = [orderByField, sortOrder];

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [orderBy],
      distinct: true,
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

  static async get(id: number | string) {
    const customer = await Customer.findByPk(Number(id), {
      include: [
        {
          model: CustomerEquipmentBalance,
          include: [{ model: ProductInventory, as: "product" }],
          as: "equipmentBalances",
        },
        {
          model: CustomerSpecialPricing,
          include: [{ model: ProductInventory, as: "product" }],
          as: "specialPricings",
        },
      ],
    });

    return customer?.get({ plain: true });
  }

  static async create(input: any) {
    const validatedData = CustomerSchema.parse(input);

    try {
      const customer = await Customer.create(validatedData);
      return customer.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async update(id: number | string, input: any) {
    const validatedData = CustomerSchema.partial().parse(input);
    const customer = await Customer.findByPk(Number(id));
    if (!customer) throw new Error("Customer not found");

    try {
      await customer.update(validatedData);
      return customer.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  /**
   * Soft-deletes a customer with no business in progress. Their settled orders
   * and invoices stay on record and keep showing their name.
   */
  static async delete(id: number | string) {
    return await sequelize.transaction(async (t) => {
      const customer = await Customer.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!customer) throw new Error("Customer not found");

      if (customer.name === WALK_IN_CUSTOMER_NAME) {
        throw new Error("The walk-in sales account can't be deleted");
      }

      const blockers = await getDeleteBlockers(customer.customerId, t);
      if (blockers.length > 0) {
        throw new Error(`Can't delete this customer: ${blockers.join(", ")}`);
      }

      await customer.destroy({ transaction: t });
      return true;
    });
  }

  static async lookup(term: string, isActiveOnly: boolean = false) {
    const searchOp = sequelize.getDialect() === "postgres" ? Op.iLike : Op.like;
    const where: any = {
      searchText: { [searchOp]: `%${term}%` },
    };
    if (isActiveOnly) {
      where.status = CustomerStatus.ACTIVE;
    }
    const customers = await Customer.findAll({
      where,
      limit: 10,
      include: [
        {
          model: CustomerEquipmentBalance,
          include: [{ model: ProductInventory, as: "product" }],
          as: "equipmentBalances",
        },
        {
          model: CustomerSpecialPricing,
          include: [{ model: ProductInventory, as: "product" }],
          as: "specialPricings",
        },
      ],
    });
    return customers.map((c) => c.get({ plain: true }));
  }

  static async getCustomerBalances(customerId: number | string) {
    const balances = await CustomerEquipmentBalance.findAll({
      where: { customerId: Number(customerId) },
      include: [{ model: ProductInventory, as: "product" }],
    });
    return balances.map((b) => b.get({ plain: true }));
  }

  static async setSpecialPricing(input: SpecialPricingFormData) {
    const validatedData = SpecialPricingSchema.parse(input);
    const customer = await Customer.findByPk(Number(validatedData.customerId));
    if (!customer) throw new Error("Customer not found");
    const product = await ProductInventory.findByPk(
      Number(validatedData.productId),
    );
    if (!product) throw new Error("Product not found");

    try {
      const [pricing, created] = await CustomerSpecialPricing.findOrCreate({
        where: {
          customerId: Number(validatedData.customerId),
          productId: Number(validatedData.productId),
        },
        defaults: validatedData,
      });
      if (!created) {
        await pricing.update(validatedData);
      }
      return pricing.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async getOrCreateWalkIn() {
    let customer = await Customer.findOne({
      where: { name: WALK_IN_CUSTOMER_NAME },
    });

    if (!customer) {
      customer = await Customer.create({
        name: WALK_IN_CUSTOMER_NAME,
        address: "Over the counter",
        phone: "",
        status: CustomerStatus.ACTIVE,
        notes: "Default system account for daily counter / walk-in sales",
      });
    }

    return customer.get({ plain: true });
  }
}

const countLabel = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? "" : "s"}`;

const getDeleteBlockers = async (customerId: number, transaction: Transaction) => {
  const blockers: string[] = [];

  const activeOrders = await Order.count({
    where: {
      customerId,
      status: { [Op.ne]: OrderStatus.CANCELLED },
      [Op.or]: [
        { paymentStatus: { [Op.ne]: PaymentStatus.PAID } },
        { status: [OrderStatus.PENDING, OrderStatus.OUT_FOR_DELIVERY] },
      ],
    },
    transaction,
  });
  if (activeOrders > 0) {
    blockers.push(countLabel(activeOrders, "unpaid or undelivered order"));
  }

  const openInvoices = await Invoice.count({
    where: {
      customerId,
      status: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
    },
    transaction,
  });
  if (openInvoices > 0) {
    blockers.push(countLabel(openInvoices, "open invoice"));
  }

  const balances = await CustomerEquipmentBalance.findAll({
    where: { customerId },
    transaction,
  });
  const containersOut = balances.reduce(
    (sum, balance) =>
      sum + balance.quantityOwed + balance.quantityTemporaryOwed,
    0,
  );
  if (containersOut > 0) {
    blockers.push(countLabel(containersOut, "container") + " still out");
  }

  return blockers;
};
