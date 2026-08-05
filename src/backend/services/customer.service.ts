import { CustomerStatus, PAGINATION } from "@/lib/definitions";
import { Op } from "sequelize";
import { sequelize } from "../db/database";
import {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  ProductInventory,
} from "../models";
import { CustomerSchema } from "../schemas/zodSchemas";
import { handleServiceError } from "./errorHandler";

export interface CustomerQueryParams {
  limit?: number;
  page?: number;
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
    try {
      const {
        limit = PAGINATION.PAGE_SIZE,
        page = PAGINATION.PAGE,
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
      const { rows, count } = await Customer.findAndCountAll({
        where,
        limit,
        offset,
        include,
        order: [["customerId", "ASC"]],
      });

      return {
        rows: rows.map((r) => r.get({ plain: true })),
        pagination: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: Number(offset / limit) + 1,
        },
      };
    } catch (error) {
      console.log(123, error);
      throw error;
    }
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

  static async getCustomerBalances(customerId: number | string) {
    const balances = await CustomerEquipmentBalance.findAll({
      where: { customerId: Number(customerId) },
      include: [{ model: ProductInventory, as: "product" }],
    });
    return balances.map((b: any) => {
      const raw = b.get ? b.get({ plain: true }) : b;
      return {
        balanceId: raw.balanceId,
        customerId: raw.customerId,
        productId: raw.productId,
        quantityOwed: raw.quantityOwed ?? 0,
        quantityTemporaryOwed: raw.quantityTemporaryOwed ?? 0,
        product: raw.product,
      };
    });
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
    const validatedData = CustomerSchema.parse(input);

    const customer = await Customer.findByPk(Number(id));
    if (!customer) throw new Error("Customer not found");

    try {
      await customer.update(validatedData);
      return customer.get({ plain: true });
    } catch (error) {
      handleServiceError(error);
    }
  }

  static async delete(id: number | string) {
    const customer = await Customer.findByPk(id);
    if (!customer) throw new Error("Customer not found");

    const count = await Customer.destroy({
      where: { customerId: Number(id) },
    });
    return count > 0;
  }

  static async lookup(term: string, isActiveOnly: boolean) {
    try {
      const query = term.toLowerCase();
      const where: any = {};
      if (isActiveOnly) {
        where.status = CustomerStatus.ACTIVE;
      }
      if (query) {
        const searchOp =
          sequelize.getDialect() === "postgres" ? Op.iLike : Op.like;
        where.searchText = { [searchOp]: `%${query}%` };
      }

      const customers = await Customer.findAll({
        where,
        limit: 50,
        order: [["name", "ASC"]],
        raw: true,
      });

      return customers; // .map((c) => c.get({ plain: true }));
    } catch (error) {
      throw error;
    }
  }

  static async getWithTemporaryBalance() {
    const customers = await Customer.findAll({
      include: [
        {
          model: CustomerEquipmentBalance,
          as: "equipmentBalances",
          required: true,
          where: {
            quantityTemporaryOwed: { [Op.gt]: 0 },
          },
          include: [{ model: ProductInventory, as: "product" }],
        },
      ],
      order: [["name", "ASC"]],
    });

    return customers.map((c) => c.get({ plain: true }));
  }
}
