import { PAGINATION, PaymentStatus } from "@/lib/definitions";
import moment from "moment-timezone";
import { Op } from "sequelize";
import {
  Customer,
  CustomerSpecialPricing,
  Order,
  OrderDetail,
  ProductInventory,
  sequelize,
  User,
} from "../models";
import { OrderSchema } from "../schemas/zodSchemas";

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
}

export class OrderService {
  static async getAll(params: OrderQueryParams = {}) {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      query = {},
    } = params;
    try {
      const where: any = {};
      const { startDate, endDate, status, paymentStatus, customerId } = query;

      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (startDate && endDate) {
        const timezone = "Asia/Manila";
        if (startDate) {
          where.createdAt = where.createdAt || {};
          where.createdAt[Op.gte] = moment
            .tz(new Date(Number(startDate)), timezone)
            .startOf("day")
            .utc()
            .toDate();
        }
        if (endDate) {
          where.createdAt = where.createdAt || {};
          where.createdAt[Op.lte] = moment
            .tz(new Date(Number(endDate)), timezone)
            .endOf("day")
            .utc()
            .toDate();
        }
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await Order.findAndCountAll({
        offset,
        limit,
        where,
        include: [
          // {
          //   model: OrderDetail,
          //   as: "orderDetails",
          //   include: [ProductInventory],
          // },
          {
            model: Customer,
            as: "customer",
            ...(query?.customerId
              ? { where: { customerId: query.customerId } }
              : {}),
          },
        ],
        order: [["createdAt", "DESC"]],
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
          model: OrderDetail,
          as: "orderDetails",
          include: [{ model: ProductInventory, as: "product" }],
        },
        {
          model: Customer,
          as: "customer",
          include: [
            {
              model: CustomerSpecialPricing,
              include: [{ model: ProductInventory, as: "product" }],
              as: "specialPricings",
            },
          ],
        },
        { model: User, as: "user" },
      ],
    });
    return order?.get({ plain: true });
  }

  static async create(input: any, createdByUserId: number) {
    const validated = OrderSchema.parse(input);

    const specialPricings = await CustomerSpecialPricing.findAll({
      where: { customerId: validated.customerId },
    });

    const preparedItems = validated.items.map((item) => {
      const sp = specialPricings.find(
        (s) => Number(s.productId) === Number(item.productId),
      );
      const discount = sp ? sp.discountAmount : item.discount || 0;
      const netUnitPrice = Math.max(0, item.unitPrice - discount);
      return {
        ...item,
        discount,
        netUnitPrice,
        subtotal: netUnitPrice * item.quantity,
      };
    });

    const calculatedTotal = preparedItems.reduce(
      (acc, item) => acc + item.subtotal,
      0,
    );

    const transaction = await sequelize.transaction();
    try {
      const order = await Order.create(
        {
          customerId: validated.customerId,
          status: validated.status,
          paymentStatus: validated.paymentStatus,
          totalAmount: calculatedTotal,
          createdBy: createdByUserId || 1,
        },
        { transaction },
      );

      for (const item of preparedItems) {
        await OrderDetail.create(
          {
            orderId: order.orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          },
          { transaction },
        );
      }

      await transaction.commit();
      const createdOrder = await Order.findByPk(order.orderId, {
        include: [
          {
            model: OrderDetail,
            as: "orderDetails",
            include: [{ model: ProductInventory, as: "product" }],
          },
          { model: Customer, as: "customer" },
        ],
      });
      return createdOrder?.get({ plain: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // static async settleOrder(
  //   orderId: number,
  //   payment_method: PaymentMethod,
  //   updated_by: number,
  // ) {
  //   const order = await Order.findByPk(orderId);
  //   if (!order) throw new Error("Order not found");
  //   if (order.payment_status === PaymentStatus.Paid)
  //     throw new Error("Order is already paid");

  //   order.payment_status = PaymentStatus.Paid;
  //   order.payment_method = payment_method;
  //   order.updated_by = updated_by;

  //   await order.save();
  //   return order;
  // }

  static async update(id: number | string, status: string) {
    const order = await Order.findByPk(Number(id));
    if (!order) throw new Error("Order not found");
    await order.update({ status });
    return order?.get({ plain: true });
  }

  static async delete(id: number | string) {
    const count = await Order.destroy({ where: { orderId: Number(id) } });
    return count > 0;
  }

  // Aliases for backward compatibility
  static getOrders = OrderService.getAll;
  static getOrderById = OrderService.get;
  static createOrder = OrderService.create;
  static updateOrderStatus = OrderService.update;
  static deleteOrder = OrderService.delete;
}
