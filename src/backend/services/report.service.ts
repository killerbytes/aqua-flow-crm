import { PAGINATION } from "@/lib/definitions";
import { Op, OrderItem } from "sequelize";
import { Customer, Order, OrderDetail, ProductInventory } from "../models";

export interface CustomersWithLastOrderParams {
  limit?: number;
  page?: number;
  order?: "ASC" | "DESC";
  sort?: string;
  query?: {
    customerId?: number;
    productId?: number;
    days?: number;
  };
}

export class ReportService {
  static async getDailySales(date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      },
    });

    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { date: targetDate, totalSales };
  }

  static async getCustomersWithLastOrder({
    limit = PAGINATION.PAGE_SIZE,
    page = PAGINATION.PAGE,
    sort,
    order,
    query,
  }: CustomersWithLastOrderParams = {}) {
    const activeSort = sort || "name";
    const activeOrder = (order || "ASC").toUpperCase() as "ASC" | "DESC";

    const customerWhere: any = {};
    if (query?.customerId) {
      customerWhere.customerId = Number(query.customerId);
    }

    let customerDbOrder: OrderItem[] | undefined;
    if (activeSort === "name" || activeSort === "customerName") {
      customerDbOrder = [["name", activeOrder]];
    } else if (activeSort === "customerId") {
      customerDbOrder = [["customerId", activeOrder]];
    }

    const customers = await Customer.findAll({
      where: Object.keys(customerWhere).length > 0 ? customerWhere : undefined,
      order: customerDbOrder,
    });

    const result = [];

    const orderDetailWhere: any = {};
    if (query?.productId) {
      orderDetailWhere.productId = Number(query.productId);
    }

    for (const customer of customers) {
      // 2. Query the latest order for each customer
      const lastOrder = await Order.findOne({
        where: { customerId: customer.customerId },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: OrderDetail,
            as: "orderDetails",
            where:
              Object.keys(orderDetailWhere).length > 0
                ? orderDetailWhere
                : undefined,
            required: query?.productId ? true : false,
            include: [
              {
                model: ProductInventory,
                as: "product",
                attributes: ["productId", "name"],
              },
            ],
          },
        ],
      });

      if (lastOrder) {
        const plainOrder = lastOrder.get({ plain: true });
        const lastOrderDate = plainOrder.createdAt;

        // Calculate days elapsed since last order
        const daysSinceLastOrder = Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        result.push({
          customerId: customer.customerId,
          customerName: customer.name,
          phone: customer.phone,
          lastOrderId: plainOrder.orderId,
          lastOrderDate: lastOrderDate,
          daysSinceLastOrder: Math.max(0, daysSinceLastOrder),
          orderStatus: plainOrder.status,
          products:
            plainOrder.orderDetails?.map((item: any) => ({
              productId: item.productId,
              productName: item.product?.name || "Unknown Product",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })) || [],
        });
      } else if (!query?.productId) {
        // Customer has never placed an order (included only when not filtering by specific productId)
        result.push({
          customerId: customer.customerId,
          customerName: customer.name,
          phone: customer.phone,
          lastOrderId: null,
          lastOrderDate: null,
          daysSinceLastOrder: null,
          orderStatus: null,
          products: [],
        });
      }
    }

    let filteredResult = result;

    if (
      query?.days !== undefined &&
      query?.days !== null &&
      !isNaN(Number(query.days))
    ) {
      const minDays = Number(query.days);
      filteredResult = result.filter(
        (item) =>
          item.daysSinceLastOrder !== null && item.daysSinceLastOrder >= minDays,
      );
    }

    if (activeSort) {
      filteredResult.sort((a, b) => {
        let comp = 0;
        if (activeSort === "name" || activeSort === "customerName") {
          const valA = a.customerName || "";
          const valB = b.customerName || "";
          comp = valA.localeCompare(valB);
        } else if (activeSort === "daysSinceLastOrder") {
          const valA = a.daysSinceLastOrder;
          const valB = b.daysSinceLastOrder;
          if (valA === null && valB === null) comp = 0;
          else if (valA === null) return 1;
          else if (valB === null) return -1;
          else comp = valA - valB;
        } else if (
          activeSort === "lastOrderDate" ||
          activeSort === "createdAt"
        ) {
          const valA = a.lastOrderDate
            ? new Date(a.lastOrderDate).getTime()
            : 0;
          const valB = b.lastOrderDate
            ? new Date(b.lastOrderDate).getTime()
            : 0;
          comp = valA - valB;
        } else if (activeSort === "customerId") {
          comp = a.customerId - b.customerId;
        }

        return activeOrder === "DESC" ? -comp : comp;
      });
    }

    const offset = (page - 1) * limit;
    const total = filteredResult.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedRows = filteredResult.slice(offset, offset + limit);

    return {
      rows: paginatedRows,
      pagination: {
        total,
        totalPages,
        currentPage: Number(page),
      },
    };
  }

  static async getWeeklyChurn() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrderCustomers = await Order.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: ["customerId"],
      group: ["customerId"],
    });

    const activeIds = new Set(recentOrderCustomers.map((o) => o.customerId));
    const allCustomers = await Customer.findAll();
    const churnCustomers = allCustomers.filter(
      (c) => !activeIds.has(c.customerId),
    );

    return { timeframe: "7_days", customers: churnCustomers };
  }
}
