import { OrderStatus, PAGINATION, PaymentStatus } from "@/lib/definitions";
import { fromCents, toCents } from "@/lib/money";
import { endOfBusinessDay, startOfBusinessDay } from "@/lib/business-time";
import { Op, OrderItem, Transaction } from "sequelize";
import { getAuthContext, UserSession } from "../auth/context";
import {
  Customer,
  CustomerSpecialPricing,
  InvoiceDetail,
  Order,
  OrderDetail,
  OrderPayment,
  ProductInventory,
  sequelize,
  User,
} from "../models";
import {
  OrderFormData,
  PaymentFormData,
  PaymentSchema,
  ReversePaymentFormData,
  ReversePaymentSchema,
} from "../schemas/zodSchemas";
import { CustomerService, WALK_IN_CUSTOMER_NAME } from "./customer.service";
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
    isInvoice?: boolean;
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
      sort,
      order: sortOrder = "ASC",
    } = params;
    try {
      const where: any = {};
      const {
        startDate,
        endDate,
        status,
        paymentStatus,
        customerId,
        isInvoice = false,
      } = query;

      if (isInvoice) {
        where.status = {
          [Op.ne]: OrderStatus.CANCELLED,
        };
        const invoiced = await InvoiceDetail.findAll({
          attributes: ["orderId"],
          where: { voidedAt: null },
        });
        where.orderId = { [Op.notIn]: invoiced.map((d) => d.orderId) };
      }

      if (status) {
        where.status = { ...where.status, [Op.eq]: status };
      }

      if (customerId) where.customerId = customerId;
      if (paymentStatus) where.paymentStatus = paymentStatus;

      if (startDate || endDate) {
        const createdAtFilter: any = {};
        if (startDate) {
          createdAtFilter[Op.gte] = startOfBusinessDay(
            new Date(Number(startDate)),
          );
        }
        if (endDate) {
          createdAtFilter[Op.lte] = endOfBusinessDay(new Date(Number(endDate)));
        }
        where.createdAt = createdAtFilter;
      }

      const orderByMap: Record<string, any> = {
        customer_name: [{ model: Customer, as: "customer" }, "name"],
        "customer.name": [{ model: Customer, as: "customer" }, "name"],
        createdAt: "createdAt",
        status: "status",
        paymentStatus: "paymentStatus",
        totalAmount: "totalAmount",
        orderId: "orderId",
      };

      const orderTarget =
        sort && orderByMap[sort] ? orderByMap[sort] : "createdAt";
      const orderBy: OrderItem = Array.isArray(orderTarget)
        ? ([...orderTarget, sortOrder] as unknown as OrderItem)
        : ([orderTarget, sortOrder] as unknown as OrderItem);

      const offset = (page - 1) * limit;

      const { rows, count } = await Order.findAndCountAll({
        offset,
        limit,
        subQuery: false,
        order: [orderBy],
        where,
        include: [
          {
            model: Customer,
            as: "customer",
            paranoid: false,
            ...(query?.customerId
              ? { where: { customerId: query.customerId } }
              : {}),
            include: [
              {
                model: CustomerSpecialPricing,
                as: "specialPricings",
                separate: true,
              },
            ],
          },
        ],
        distinct: true,
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
          paranoid: false,
          include: [
            {
              model: CustomerSpecialPricing,
              as: "specialPricings",
            },
          ],
        },
        { model: User, as: "user", paranoid: false },
        { model: User, as: "deliveredByUser", paranoid: false },
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [{ model: ProductInventory, as: "product", paranoid: false }],
        },
        {
          model: OrderPayment,
          as: "orderPayments",
          include: [
            { model: User, as: "user", paranoid: false },
            { model: User, as: "reversedByUser", paranoid: false },
          ],
        },
      ],
      order: [[{ model: OrderPayment, as: "orderPayments" }, "paidAt", "ASC"]],
    });
    return order ? order.get({ plain: true }) : null;
  }

  /**
   * Order creation for requests from staff. Only walk-in sales are recorded as
   * already delivered, paid, and dated by the cashier. Everything else starts
   * as a new unpaid order, whatever the request says.
   */
  static async createForStaff(input: OrderFormData, createdByUserId: number) {
    const customer = await CustomerService.get(input.customerId);
    if (customer?.name === WALK_IN_CUSTOMER_NAME) {
      return await OrderService.create(input, createdByUserId);
    }
    return await OrderService.create(
      {
        ...input,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        createdAt: undefined,
      },
      createdByUserId,
    );
  }

  static async create(input: OrderFormData, createdByUserId: number) {
    const { customerId, status, paymentStatus, items, createdAt } = input;
    const createdBy = createdByUserId;

    const customer = await CustomerService.get(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    let totalCents = 0;
    const validatedItems: {
      productId: number;
      quantity: number;
      unitPrice: number;
      discount: number;
    }[] = [];

    for (const item of items) {
      const product = await ProductService.get(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const specialPricing = await CustomerSpecialPricing.findOne({
        where: { customerId, productId: item.productId },
      });

      // Prices always come from the database, never from the request.
      const unitPrice = Number(product.unitPrice);
      const discount = specialPricing
        ? Number(specialPricing.discountAmount)
        : 0;
      const netUnitCents = Math.max(0, toCents(unitPrice) - toCents(discount));

      totalCents += netUnitCents * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount,
      });
    }

    const orderId = await sequelize.transaction(async (t) => {
      // Locked so the customer can't be deleted while this order is saved.
      const lockedCustomer = await Customer.findByPk(customerId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!lockedCustomer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      const order = await Order.create(
        {
          customerId,
          totalAmount: fromCents(totalCents),
          status,
          paymentStatus,
          createdBy,
          createdAt,
          deliveredAt: status === OrderStatus.DELIVERED ? createdAt ?? new Date() : null,
          deliveredBy: status === OrderStatus.DELIVERED ? createdBy : null,
        },
        { transaction: t },
      );

      await OrderDetail.bulkCreate(
        validatedItems.map((item) => ({ ...item, orderId: order.orderId })),
        { transaction: t },
      );

      // Orders created already paid (walk-in sales) take payment at the counter.
      if (paymentStatus === PaymentStatus.PAID) {
        await OrderPayment.create(
          {
            orderId: order.orderId,
            amount: order.totalAmount,
            paidAt: order.createdAt,
            loggedBy: createdBy,
          },
          { transaction: t },
        );
      }

      return order.orderId;
    });

    return await this.get(orderId);
  }

  static async updateStatus(
    id: number | string,
    status: OrderStatus | string,
    user?: UserSession | any,
  ) {
    let targetStatus = status as OrderStatus;
    if ((status as string) === "COMPLETED") {
      targetStatus = OrderStatus.DELIVERED;
    }

    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(targetStatus)) {
      throw new Error(`Invalid order status: ${status}`);
    }

    return await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      const currentStatus = order.status;

      if (currentStatus === targetStatus) {
        return order.get({ plain: true });
      }

      if (currentStatus === OrderStatus.CANCELLED) {
        throw new Error(
          `Cannot change status of a ${currentStatus.toLowerCase()} order`,
        );
      }

      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.OUT_FOR_DELIVERY]: [
          OrderStatus.PENDING,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ],
        [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED],
        [OrderStatus.CANCELLED]: [],
      };

      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(targetStatus)) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${targetStatus}`,
        );
      }

      if (
        targetStatus === OrderStatus.CANCELLED &&
        (await isInvoiced(order.orderId, t))
      ) {
        throw new Error("Cannot cancel an order that is on an invoice");
      }

      const currentUser =
        user || (await getAuthContext().catch(() => null))?.user;
      if (currentUser) {
        console.log(
          `[OrderService] Order #${id} status updating from ${currentStatus} to ${targetStatus} by user:`,
          currentUser,
        );
      }

      await order.update(
        {
          status: targetStatus,
          ...(targetStatus === OrderStatus.DELIVERED
            ? { deliveredAt: new Date(), deliveredBy: currentUser?.userId ?? null }
            : {}),
        },
        { transaction: t },
      );
      return order.get({ plain: true });
    });
  }

  static async delete(id: number | string) {
    const count = await Order.destroy({ where: { orderId: Number(id) } });
    return count > 0;
  }

  static async makePayment(
    input: PaymentFormData,
    id: number,
    loggedByUserId: number,
  ) {
    const validatedData = PaymentSchema.parse(input);

    return await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new Error("Order is already marked as PAID");
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new Error(
          `Cannot process payment for a ${order.status.toLowerCase()} order`,
        );
      }

      if (await isInvoiced(order.orderId, t)) {
        throw new Error(
          "This order is on an invoice. Record the payment on the invoice.",
        );
      }

      await order.update(
        {
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: validatedData.paymentMethod,
          paymentNotes: validatedData.paymentNotes,
        },
        { transaction: t },
      );
      await OrderPayment.create(
        {
          orderId: order.orderId,
          amount: order.totalAmount,
          paymentMethod: validatedData.paymentMethod,
          paymentNotes: validatedData.paymentNotes,
          paidAt: new Date(),
          loggedBy: loggedByUserId,
        },
        { transaction: t },
      );
      return order.get({ plain: true });
    });
  }

  /**
   * Undoes a direct order payment logged by mistake. It stays on record, marked
   * as reversed, and the order goes back to unpaid.
   */
  static async reversePayment(
    paymentId: number | string,
    input: ReversePaymentFormData,
    userId: number,
  ) {
    const { reason } = ReversePaymentSchema.parse(input);

    return await sequelize.transaction(async (t) => {
      const found = await OrderPayment.findByPk(Number(paymentId), {
        transaction: t,
      });
      if (!found) throw new Error("Payment not found");

      // The order lock serialises payments and reversals on it.
      const order = await Order.findByPk(found.orderId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new Error(`Order with ID ${found.orderId} not found`);

      const payment = await OrderPayment.findByPk(found.id, { transaction: t });
      if (payment!.reversedAt) {
        throw new Error("This payment has already been reversed");
      }

      await payment!.update(
        { reversedAt: new Date(), reversedBy: userId, reversalReason: reason },
        { transaction: t },
      );
      await order.update(
        {
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: null,
          paymentNotes: null,
        },
        { transaction: t },
      );

      return payment!.get({ plain: true });
    });
  }
}

const isInvoiced = async (orderId: number, transaction: Transaction) =>
  (await InvoiceDetail.count({
    where: { orderId, voidedAt: null },
    transaction,
  })) > 0;

const getSummary = async (where: any) => {
  // Sales count by when orders were delivered, matching the dashboard. The other
  // figures describe the orders in the list, so they keep its order-date filter.
  const { createdAt: orderDateFilter, ...salesWhere } = where;
  const totalAmount = await Order.sum("totalAmount", {
    where: {
      ...salesWhere,
      ...(orderDateFilter ? { deliveredAt: orderDateFilter } : {}),
      status: { [Op.in]: [OrderStatus.DELIVERED] },
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

  // Cancelled orders stay UNPAID but are not owed, so they don't count here.
  const unpaidOrders = await Order.count({
    where: {
      ...where,
      status: { ...where.status, [Op.ne]: OrderStatus.CANCELLED },
      paymentStatus: { [Op.in]: [PaymentStatus.UNPAID] },
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
      label: "Delivered Sales",
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
