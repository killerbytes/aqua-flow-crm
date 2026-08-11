import { CustomerStatus, PAGINATION } from "@/lib/definitions";
import { Op, OrderItem } from "sequelize";
import { sequelize } from "../db/database";
import {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  ProductInventory,
} from "../models";
import {
  CustomerSchema,
  SpecialPricingFormData,
  SpecialPricingSchema,
} from "../schemas/zodSchemas";
import { handleServiceError } from "./errorHandler";

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
    try {
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

  static async delete(id: number | string) {
    const customer = await Customer.findByPk(Number(id));
    if (!customer) throw new Error("Customer not found");
    await customer.destroy();
    return true;
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
    });
    return customers.map((c) => c.get({ plain: true }));
  }

  static async getWithTemporaryBalance() {
    const result = await CustomerService.getAll({
      query: { withTemporaryBalanceOnly: true },
    });
    return result.rows;
  }

  static async getCustomerBalances(customerId: number | string) {
    const balances = await CustomerEquipmentBalance.findAll({
      where: { customerId: Number(customerId) },
      include: [{ model: ProductInventory, as: "product" }],
    });
    return balances.map((b) => b.get({ plain: true }));
  }

  static async getCustomerPricing(customerId: number | string) {
    const pricing = await CustomerSpecialPricing.findAll({
      where: { customerId: Number(customerId) },
      include: [{ model: ProductInventory, as: "product" }],
    });
    return pricing.map((p) => p.get({ plain: true }));
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
}
