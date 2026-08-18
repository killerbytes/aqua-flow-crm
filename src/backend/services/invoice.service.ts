import { InvoiceStatus, PAGINATION, PaymentStatus } from "@/lib/definitions";
import { Op, OrderItem } from "sequelize";
import {
  Customer,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  sequelize,
  User,
} from "../models";
import {
  InvoiceFormData,
  InvoicePaymentFormData,
  InvoicePaymentSchema,
} from "../schemas/zodSchemas";

export interface InvoiceQueryParams {
  limit?: number;
  page?: number;
  sort?: string;
  order?: string;
  query?: {
    status?: InvoiceStatus;
  };
}

export class InvoiceService {
  static async getAll(params: InvoiceQueryParams = {}) {
    try {
      const {
        limit = PAGINATION.PAGE_SIZE,
        page = PAGINATION.PAGE,
        sort,
        order: sortOrder = "ASC",
        query,
      } = params;
      const { status } = query || {};

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const include: any[] = [
        {
          model: InvoiceDetail,
          as: "invoiceDetails",
        },
        {
          model: Customer,
          as: "customer",
        },
      ];

      const offset = (page - 1) * limit;

      const orderByMap: Record<string, string> = {
        status: "status",
      };

      const orderByField =
        sort && orderByMap[sort] ? orderByMap[sort] : "customerId";
      const orderBy: OrderItem = [orderByField, sortOrder];

      const { rows, count } = await Invoice.findAndCountAll({
        where,
        limit,
        offset,
        include,
        order: [orderBy],
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
      console.log(123, error);
      throw error;
    }
  }

  static async get(id: number | string) {
    const invoice = await Invoice.findByPk(Number(id), {
      include: [
        {
          model: InvoiceDetail,
          as: "invoiceDetails",
          include: [
            {
              model: Order,
              as: "order",
            },
          ],
        },
        {
          model: Customer,
          as: "customer",
        },
        {
          model: User,
          as: "user",
        },
      ],
    });

    return invoice?.get({ plain: true });
  }
  static async create(data: InvoiceFormData, userId: number) {
    return await sequelize.transaction(async (t) => {
      // 1. Fetch orders matching selected order IDs for the given customer
      const orders = await Order.findAll({
        where: {
          orderId: data.items,
          customerId: data.customerId,
        },
        transaction: t,
      });

      if (!orders || orders.length === 0) {
        throw new Error("No valid orders found for invoice creation");
      }

      // 2. Calculate sum of total amounts from orders
      const totalAmount = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      );

      // 3. Create main Invoice record
      const invoice = await Invoice.create(
        {
          customerId: data.customerId,
          dateIssued: data.dateIssued || new Date(),
          dueDate:
            data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          amount: totalAmount,
          discount: 0,
          status: data.status || InvoiceStatus.UNPAID,
          loggedBy: userId,
        },
        { transaction: t },
      );

      // 4. Create InvoiceDetail entries for each orderId
      const invoiceDetailsData = orders.map((order) => ({
        invoiceId: invoice.invoiceId,
        orderId: order.orderId,
      }));

      await InvoiceDetail.bulkCreate(invoiceDetailsData, { transaction: t });

      return invoice.toJSON();
    });
  }

  static async payInvoice(input: InvoicePaymentFormData, loggedBy: number = 1) {
    const validatedData = InvoicePaymentSchema.parse(input);
    try {
      return await sequelize.transaction(async (t) => {
        const invoice = await Invoice.findByPk(validatedData.invoiceId, {
          include: [
            {
              model: InvoiceDetail,
              as: "invoiceDetails",
            },
          ],
          transaction: t,
        });

        if (!invoice) {
          throw new Error("Invoice not found");
        }
        if (invoice.status === InvoiceStatus.PAID) {
          throw new Error("Invoice is already marked as PAID");
        }

        const existingPayments = await InvoicePayment.findAll({
          where: { invoiceId: validatedData.invoiceId },
          transaction: t,
        });

        const previousPaidAmount = existingPayments.reduce(
          (sum, p) => sum + Number(p.paymentAmount),
          0,
        );

        const invoiceTotalAmount = Number(invoice.amount);
        const remainingBalance = invoiceTotalAmount - previousPaidAmount;

        if (validatedData.paymentAmount <= 0) {
          throw new Error("Payment amount must be greater than zero");
        }

        if (validatedData.paymentAmount > remainingBalance) {
          throw new Error("Payment amount exceeds remaining balance");
        }

        const newTotalPaid = previousPaidAmount + validatedData.paymentAmount;

        if (newTotalPaid >= invoiceTotalAmount) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paymentDate = validatedData.paymentDate
            ? new Date(validatedData.paymentDate)
            : new Date();

          const orderIds = (invoice.invoiceDetails || []).map(
            (detail) => detail.orderId,
          );

          if (orderIds.length > 0) {
            await Order.update(
              { paymentStatus: PaymentStatus.PAID },
              {
                where: { orderId: orderIds },
                transaction: t,
              },
            );
          }
        } else {
          invoice.status = InvoiceStatus.PARTIAL;
        }

        await invoice.save({ transaction: t });

        await InvoicePayment.create(
          {
            invoiceId: validatedData.invoiceId,
            paymentAmount: validatedData.paymentAmount,
            paymentDate: validatedData.paymentDate || new Date(),
            paymentMethod: validatedData.paymentMethod,
            paymentNotes: validatedData.paymentNotes,
            loggedBy,
          },
          { transaction: t },
        );

        return invoice.get({ plain: true });
      });
    } catch (error) {
      console.log(1234, error);
      throw error;
    }
  }
  static async getPayments(invoiceId: number) {
    const payments = await InvoicePayment.findAll({
      where: { invoiceId },
      include: [{ model: User, as: "user" }],
    });
    return payments.map((p) => p.get({ plain: true }));
  }
}

const getSummary = async (where: any) => {
  const openInvoices = await Invoice.findAll({
    attributes: ["invoiceId", "amount"],
    where: {
      ...where,
      status: { [Op.in]: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
    },
  });

  const totalOpenAmount = openInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0,
  );

  const openInvoiceIds = openInvoices.map((inv) => inv.invoiceId);

  let totalPaymentsOnOpenInvoices = 0;
  if (openInvoiceIds.length > 0) {
    totalPaymentsOnOpenInvoices = Number(
      (await InvoicePayment.sum("paymentAmount", {
        where: { invoiceId: { [Op.in]: openInvoiceIds } },
      })) || 0,
    );
  }

  const totalUnpaid = Math.max(
    0,
    totalOpenAmount - totalPaymentsOnOpenInvoices,
  );

  const unpaidOrders = await Invoice.count({
    where: {
      ...where,
      status: { [Op.in]: [InvoiceStatus.UNPAID] },
    },
  });

  const partialOrders = await Invoice.count({
    where: {
      ...where,
      status: { [Op.in]: [InvoiceStatus.PARTIAL] },
    },
  });

  return {
    totalUnpaid: {
      label: "Total Unpaid",
      value: totalUnpaid,
    },
    unpaidOrders: {
      label: "Unpaid",
      value: unpaidOrders,
    },
    partialOrders: {
      label: "Partial",
      value: partialOrders,
    },
  };
};
