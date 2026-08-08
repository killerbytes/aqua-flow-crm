import { OrderStatus, PAGINATION, PaymentStatus } from "@/lib/definitions";
import moment from "moment-timezone";
import { Op } from "sequelize";
import {
  Customer,
  CustomerSpecialPricing,
  Order,
  OrderDetail,
  ProductInventory,
  User,
} from "../models";
import { PaymentFormData, PaymentSchema } from "../schemas/zodSchemas";
import { CustomerService } from "./customer.service";
import { ProductService } from "./product.service";

export interface OrderQueryParams {
  limit?: number;
  page?: number;
  query?: {
    status?: string;
    customerId?: number;
    startDate?: string;
    endDate?: string;
    paymentStatus?: PaymentStatus;
  };
  sort?: string;
  order?: "ASC" | "DESC";
}

export class OrderService {
  static async getAll(params: OrderQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      query = {},
      sort = "createdAt",
      order: sortOrder = "DESC",
    } = params;
    try {
      const where: any = {};
      const { startDate, endDate, status, paymentStatus, customerId } = query;

      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (paymentStatus) where.paymentStatus = paymentStatus;

      if (startDate || endDate) {
        const timezone = "Asia/Manila";
        const createdAtFilter: any = {};
        if (startDate) {
          createdAtFilter[Op.gte] = moment
            .tz(new Date(Number(startDate)), timezone)
            .startOf("day")
            .utc()
            .toDate();
        }
        if (endDate) {
          createdAtFilter[Op.lte] = moment
            .tz(new Date(Number(endDate)), timezone)
            .endOf("day")
            .utc()
            .toDate();
        }
        where.createdAt = createdAtFilter;
      }
      const orderByMap: Record<string, any[]> = {
        "customer.name": [{ model: Customer, as: "customer" }, "name"],
      };
      const orderBy: any = orderByMap[sort]
        ? [[...orderByMap[sort], sortOrder]]
        : [[sort, sortOrder]];

      const offset = (page - 1) * limit;
      const { rows, count } = await Order.findAndCountAll({
        offset,
        limit,
        order: orderBy,
        where,
        include: [
          {
            model: Customer,
            as: "customer",
            ...(query?.customerId
              ? { where: { customerId: query.customerId } }
              : {}),
            include: [
              {
                model: CustomerSpecialPricing,
                as: "specialPricings",
              },
            ],
          },
        ],
      });

      return {
        rows: rows.map((r) => r.get({ plain: true })),
        pagination: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: Number(offset / limit) + 1,
        },
        summary: await getSummary(where),
      };
    } catch (error) {
      console.log(error);
      return {
        rows: [],
        pagination: {
          total: 0,
          totalPages: 0,
          currentPage: 0,
        },
      };
    }
  }

  static async get(id: number | string) {
    const order = await Order.findByPk(Number(id), {
      include: [
        {
          model: Customer,
          as: "customer",
          include: [
            {
              model: CustomerSpecialPricing,
              as: "specialPricings",
            },
          ],
        },
        { model: User, as: "user" },
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [{ model: ProductInventory, as: "product" }],
        },
      ],
    });
    return order ? order.get({ plain: true }) : null;
  }

  static async create(
    input: {
      customerId: number;
      createdBy?: number;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      items: {
        productId: number;
        quantity: number;
        unitPrice: number;
        discount?: number;
      }[];
    },
    createdByUserId: number = 1,
  ) {
    const {
      customerId,
      status,
      paymentStatus,
      items,
      createdBy: inputCreatedBy,
    } = input;
    const createdBy = inputCreatedBy || createdByUserId || 1;

    const customer = await CustomerService.get(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await ProductService.get(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const specialPricing = await CustomerSpecialPricing.findOne({
        where: { customerId, productId: item.productId },
      });

      const effectiveUnitPrice = Number(item.unitPrice || product.unitPrice);
      const itemDiscount = specialPricing
        ? Number(specialPricing.discountAmount)
        : item.discount || 0;
      const netUnitPrice = Math.max(0, effectiveUnitPrice - itemDiscount);

      calculatedTotal += netUnitPrice * item.quantity;
      validatedItems.push({
        ...item,
        unitPrice: effectiveUnitPrice,
        discount: itemDiscount,
      });
    }

    const order = await Order.create({
      customerId,
      totalAmount: calculatedTotal,
      status,
      paymentStatus,
      createdBy,
    });

    const plainOrder = order.get({ plain: true });

    for (const item of validatedItems) {
      await OrderDetail.create({
        orderId: plainOrder.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      });

      const product = await ProductService.get(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stockInStation - item.quantity);
        await ProductService.update(item.productId, {
          stockInStation: newStock,
        });
      }
    }

    return await this.get(plainOrder.orderId);
  }

  static async updateStatus(id: number | string, status: OrderStatus | string) {
    let targetStatus = status as OrderStatus;
    if ((status as string) === "COMPLETED") {
      targetStatus = OrderStatus.DELIVERED;
    }

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(targetStatus)) {
      throw new Error(`Invalid order status: ${status}`);
    }

    const order = await Order.findByPk(Number(id), {
      include: [{ model: OrderDetail, as: "orderDetails" }],
    });
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    const currentStatus = order.status;

    if (currentStatus === targetStatus) {
      return order.get({ plain: true });
    }

    if (
      currentStatus === OrderStatus.CANCELLED ||
      currentStatus === OrderStatus.DELETED
    ) {
      throw new Error(
        `Cannot change status of a ${currentStatus.toLowerCase()} order`,
      );
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.DELETED,
      ],
      [OrderStatus.OUT_FOR_DELIVERY]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.DELETED,
      ],
      [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED, OrderStatus.DELETED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.DELETED]: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    if (
      targetStatus === OrderStatus.CANCELLED ||
      targetStatus === OrderStatus.DELETED
    ) {
      if (order.orderDetails && order.orderDetails.length > 0) {
        for (const item of order.orderDetails) {
          const product = await ProductService.get(item.productId);
          if (product) {
            await ProductService.update(item.productId, {
              stockInStation: product.stockInStation + item.quantity,
            });
          }
        }
      }
    }

    await order.update({ status: targetStatus });
    return order.get({ plain: true });
  }

  static async update(id: number | string, input: any) {
    if (typeof input === "string") {
      return this.updateStatus(id, input as OrderStatus);
    }
    const order = await Order.findByPk(Number(id));
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }
    await order.update(input);
    return order?.get({ plain: true });
  }

  static async delete(id: number | string) {
    const count = await Order.destroy({ where: { orderId: Number(id) } });
    return count > 0;
  }

  static async makePayment(id: number, input: PaymentFormData) {
    const validatedData = PaymentSchema.parse(input);
    const order = await Order.findByPk(Number(id), {
      include: [{ model: OrderDetail, as: "orderDetails" }],
    });
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Order is already marked as PAID");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.DELETED
    ) {
      throw new Error(
        `Cannot process payment for a ${order.status.toLowerCase()} order`,
      );
    }

    await order.update({
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: validatedData.paymentMethod,
      paymentNotes: validatedData.paymentNotes,
    });
    return order.get({ plain: true });
  }
}

const getSummary = async (where: any) => {
  const totalAmount = await Order.sum("totalAmount", {
    where: {
      ...where,
      ...{
        status: { [Op.in]: [OrderStatus.DELIVERED] },
      },
    },
  });

  const pendingOrders = await Order.count({
    where: {
      ...where,
      ...{
        status: { [Op.in]: [OrderStatus.PENDING] },
      },
    },
  });

  const cancelledOrders = await Order.count({
    where: {
      ...where,
      ...{
        status: { [Op.in]: [OrderStatus.CANCELLED] },
      },
    },
  });

  const unpaidOrders = await Order.count({
    where: {
      ...where,
      ...{
        paymentStatus: { [Op.in]: [PaymentStatus.UNPAID] },
      },
    },
  });

  const deliveryOrders = await Order.count({
    where: {
      ...where,
      ...{
        status: { [Op.in]: [OrderStatus.OUT_FOR_DELIVERY] },
      },
    },
  });

  return {
    totalAmount: {
      label: "Total Sales",
      value: totalAmount,
    },
    pendingOrders: {
      label: "Pending",
      value: pendingOrders,
    },
    cancelledOrders: {
      label: "Cancelled",
      value: cancelledOrders,
    },
    unpaidOrders: {
      label: "Unpaid",
      value: unpaidOrders,
    },
    deliveryOrders: {
      label: "Out for Delivery",
      value: deliveryOrders,
    },
  };
};
