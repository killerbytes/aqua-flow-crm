import { PAGINATION } from "@/lib/definitions";
import { Op } from "sequelize";
import {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  ProductInventory,
} from "../models";
import { CustomerSchema } from "../schemas/zodSchemas";

export interface CustomerQueryParams {
  limit?: number;
  page?: number;
  query?: {
    withSpecialPricing?: boolean;
    withBalance?: boolean;
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
          selectedBarangays: [],
          term: "",
        },
      } = params;
      const {
        withSpecialPricing = false,
        withBalance = false,
        selectedBarangays,
        term,
      } = query || {};

      const where: any = {};
      if (selectedBarangays && selectedBarangays.length > 0) {
        where.barangayId = { [Op.in]: selectedBarangays };
      }
      if (term) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${term}%` } },
          { phone: { [Op.iLike]: `%${term}%` } },
          { address: { [Op.iLike]: `%${term}%` } },
        ];
      }

      const include: any[] = [
        {
          model: CustomerEquipmentBalance,
          required: Boolean(withBalance),
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
      });
      console.log(rows);

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
      where: { customer_id: Number(customerId) },
      include: [{ model: ProductInventory }],
    });
    return balances.map((b: any) => {
      const raw = b.get ? b.get({ plain: true }) : b;
      return {
        balanceId: raw.balance_id ?? raw.balanceId,
        customerId: raw.customer_id ?? raw.customerId,
        productId: raw.product_id ?? raw.productId,
        quantityOwed: raw.quantity_owed ?? raw.quantityOwed ?? 0,
        quantityTemporaryOwed:
          raw.quantity_temporary_owed ?? raw.quantityTemporaryOwed ?? 0,
        product: raw.ProductInventory
          ? {
              productId:
                raw.ProductInventory.product_id ??
                raw.ProductInventory.productId,
              name: raw.ProductInventory.name,
              unitPrice:
                raw.ProductInventory.unit_price ??
                raw.ProductInventory.unitPrice,
              stockInStation:
                raw.ProductInventory.stock_in_station ??
                raw.ProductInventory.stockInStation,
            }
          : raw.product,
      };
    });
  }

  static async create(input: any) {
    const validatedData = CustomerSchema.parse(input);
    const customer = await Customer.create(validatedData);
    return customer.get({ plain: true });
  }

  static async update(id: number | string, input: any) {
    const validatedData = CustomerSchema.partial().parse(input);

    const customer = await Customer.findByPk(Number(id));
    if (!customer) throw new Error("Customer not found");

    await customer.update(validatedData);
    return customer.get({ plain: true });
  }

  static async delete(id: number | string) {
    const customer = await Customer.findByPk(id);
    if (!customer) throw new Error("Customer not found");

    const count = await Customer.destroy({
      where: { customerId: Number(id) },
    });
    return count > 0;
  }

  // Aliases for compatibility
  static getCustomers = CustomerService.getAll;
  static getCustomerById = CustomerService.get;
  static createCustomer = CustomerService.create;
  static updateCustomer = CustomerService.update;
  static deleteCustomer = CustomerService.delete;
}
