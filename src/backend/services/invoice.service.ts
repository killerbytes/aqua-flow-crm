import {
  InvoiceStatus,
  OrderStatus,
  PAGINATION,
  PaymentStatus,
} from "@/lib/definitions";
import { toPagination } from "@/lib/pagination";
import { fromCents, toCents } from "@/lib/money";
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
  ReversePaymentFormData,
  ReversePaymentSchema,
  VoidInvoiceFormData,
  VoidInvoiceSchema,
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
        paranoid: false,
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
      pagination: toPagination(count, limit, page),
      summary: await getSummary(where),
    };
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
          paranoid: false,
        },
        {
          model: User,
          as: "user",
          paranoid: false,
        },
        {
          model: User,
          as: "voidedByUser",
          paranoid: false,
        },
      ],
    });

    return invoice?.get({ plain: true });
  }
  static async create(data: InvoiceFormData, userId: number) {
    return await sequelize.transaction(async (t) => {
      const orderIds = [...new Set(data.items)];

      // Locked so an order can't be paid or cancelled while being invoiced.
      const orders = await Order.findAll({
        where: {
          orderId: orderIds,
          customerId: data.customerId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (orders.length === 0) {
        throw new Error("No valid orders found for invoice creation");
      }
      if (orders.length !== orderIds.length) {
        throw new Error("Some orders were not found for this customer");
      }

      const listIds = (matching: Order[]) =>
        matching.map((order) => `#${order.orderId}`).join(", ");

      const cancelled = orders.filter(
        (order) => order.status === OrderStatus.CANCELLED,
      );
      if (cancelled.length > 0) {
        throw new Error(`Cancelled orders can't be invoiced: ${listIds(cancelled)}`);
      }

      const paid = orders.filter(
        (order) => order.paymentStatus === PaymentStatus.PAID,
      );
      if (paid.length > 0) {
        throw new Error(`These orders are already paid: ${listIds(paid)}`);
      }

      const existing = await InvoiceDetail.findAll({
        where: { orderId: orderIds, voidedAt: null },
        transaction: t,
      });
      if (existing.length > 0) {
        const ids = existing.map((detail) => `#${detail.orderId}`).join(", ");
        throw new Error(`These orders are already on an invoice: ${ids}`);
      }

      const totalCents = orders.reduce(
        (sum, order) => sum + toCents(order.totalAmount),
        0,
      );

      // New invoices are always unpaid. Payments are what change the status.
      const invoice = await Invoice.create(
        {
          customerId: data.customerId,
          dateIssued: data.dateIssued || new Date(),
          dueDate:
            data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          amount: fromCents(totalCents),
          discount: 0,
          status: InvoiceStatus.UNPAID,
          loggedBy: userId,
        },
        { transaction: t },
      );

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

    return await sequelize.transaction(async (t) => {
      // Locked so simultaneous payments can't both pass the balance check.
      const invoice = await Invoice.findByPk(validatedData.invoiceId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error("Invoice is already marked as PAID");
      }
      if (invoice.status === InvoiceStatus.VOID) {
        throw new Error("This invoice has been voided");
      }

      const existingPayments = await InvoicePayment.findAll({
        where: { invoiceId: validatedData.invoiceId, reversedAt: null },
        transaction: t,
      });

      const previousPaidCents = existingPayments.reduce(
        (sum, payment) => sum + toCents(payment.paymentAmount),
        0,
      );

      const invoiceCents = toCents(invoice.amount);
      const remainingCents = invoiceCents - previousPaidCents;
      const paymentCents = toCents(validatedData.paymentAmount);

      if (paymentCents <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      if (paymentCents > remainingCents) {
        throw new Error("Payment amount exceeds remaining balance");
      }

      if (paymentCents === remainingCents) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paymentDate = validatedData.paymentDate
          ? new Date(validatedData.paymentDate)
          : new Date();

        const details = await InvoiceDetail.findAll({
          where: { invoiceId: invoice.invoiceId },
          transaction: t,
        });

        if (details.length > 0) {
          await Order.update(
            { paymentStatus: PaymentStatus.PAID },
            {
              where: { orderId: details.map((detail) => detail.orderId) },
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
          paymentAmount: fromCents(paymentCents),
          paymentDate: validatedData.paymentDate || new Date(),
          paymentMethod: validatedData.paymentMethod,
          paymentNotes: validatedData.paymentNotes,
          loggedBy,
        },
        { transaction: t },
      );

      return invoice.get({ plain: true });
    });
  }
  /**
   * Cancels a mistaken invoice that has no payments. It stays on record, and its
   * orders become free to be paid, cancelled, or invoiced again.
   */
  static async voidInvoice(
    id: number | string,
    input: VoidInvoiceFormData,
    userId: number,
  ) {
    const { reason } = VoidInvoiceSchema.parse(input);

    return await sequelize.transaction(async (t) => {
      // Locked so a payment can't land while this is being voided.
      const invoice = await Invoice.findByPk(Number(id), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }
      if (invoice.status === InvoiceStatus.VOID) {
        throw new Error("This invoice is already void");
      }

      const payments = await InvoicePayment.count({
        where: { invoiceId: invoice.invoiceId, reversedAt: null },
        transaction: t,
      });
      if (payments > 0) {
        throw new Error("This invoice has payments, so it can't be voided");
      }

      const voidedAt = new Date();
      await invoice.update(
        {
          status: InvoiceStatus.VOID,
          voidedAt,
          voidedBy: userId,
          voidReason: reason,
        },
        { transaction: t },
      );
      await InvoiceDetail.update(
        { voidedAt },
        { where: { invoiceId: invoice.invoiceId }, transaction: t },
      );

      return invoice.get({ plain: true });
    });
  }

  /**
   * Undoes a payment logged by mistake. It stays on record, marked as reversed,
   * and the invoice and its orders go back to what the remaining payments cover.
   */
  static async reversePayment(
    paymentId: number | string,
    input: ReversePaymentFormData,
    userId: number,
  ) {
    const { reason } = ReversePaymentSchema.parse(input);

    return await sequelize.transaction(async (t) => {
      const found = await InvoicePayment.findByPk(Number(paymentId), {
        transaction: t,
      });
      if (!found) throw new Error("Payment not found");

      // The invoice lock is what serialises payments, reversals, and voids on it.
      const invoice = await Invoice.findByPk(found.invoiceId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!invoice) throw new Error("Invoice not found");

      // Read again under the lock, in case it was reversed meanwhile.
      const payment = await InvoicePayment.findByPk(found.id, {
        transaction: t,
      });
      if (payment!.reversedAt) {
        throw new Error("This payment has already been reversed");
      }

      await payment!.update(
        { reversedAt: new Date(), reversedBy: userId, reversalReason: reason },
        { transaction: t },
      );

      const remaining = await InvoicePayment.findAll({
        where: { invoiceId: invoice.invoiceId, reversedAt: null },
        transaction: t,
      });
      const paidCents = remaining.reduce(
        (sum, p) => sum + toCents(p.paymentAmount),
        0,
      );

      const wasPaid = invoice.status === InvoiceStatus.PAID;
      if (paidCents >= toCents(invoice.amount)) {
        invoice.status = InvoiceStatus.PAID;
      } else {
        invoice.status =
          paidCents > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.UNPAID;
        invoice.paymentDate = null as any;
      }
      await invoice.save({ transaction: t });

      if (wasPaid && invoice.status !== InvoiceStatus.PAID) {
        const details = await InvoiceDetail.findAll({
          where: { invoiceId: invoice.invoiceId, voidedAt: null },
          transaction: t,
        });
        if (details.length > 0) {
          await Order.update(
            { paymentStatus: PaymentStatus.UNPAID },
            {
              where: { orderId: details.map((detail) => detail.orderId) },
              transaction: t,
            },
          );
        }
      }

      return payment!.get({ plain: true });
    });
  }

  static async getPayments(invoiceId: number) {
    const payments = await InvoicePayment.findAll({
      where: { invoiceId },
      include: [
        { model: User, as: "user", paranoid: false },
        { model: User, as: "reversedByUser", paranoid: false },
      ],
      order: [["paymentDate", "ASC"]],
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
        where: { invoiceId: { [Op.in]: openInvoiceIds }, reversedAt: null },
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
