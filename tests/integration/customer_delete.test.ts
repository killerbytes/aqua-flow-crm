import { beforeAll, describe, expect, it } from "vitest";
import { Customer } from "../../src/backend/models";
import {
  CustomerService,
  EquipmentService,
  InvoiceService,
  OrderService,
} from "../../src/backend/services";
import {
  EquipmentActionType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const PRODUCT_ID = 1;

const newCustomer = async () =>
  (await CustomerService.create({
    name: "Delete Check",
    address: "123 Test Street",
    phone: "",
  }))!;

const newOrder = (
  customerId: number,
  status: string = OrderStatus.DELIVERED,
) =>
  OrderService.create(
    {
      customerId,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    } as any,
    1,
  );

const issue = (
  customerId: number,
  actionType: string = EquipmentActionType.ISSUE,
) =>
  EquipmentService.logEquipment(
    { customerId, productId: PRODUCT_ID, actionType, quantity: 1 },
    1,
  );

describe("Integration - Deleting Customers", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should delete a customer with no history", async () => {
    const customer = await newCustomer();

    await expect(CustomerService.delete(customer.customerId)).resolves.toBe(
      true,
    );
    expect(await Customer.findByPk(customer.customerId)).toBeNull();
  });

  it("should refuse while an order is unpaid", async () => {
    const customer = await newCustomer();
    await newOrder(customer.customerId);

    await expect(CustomerService.delete(customer.customerId)).rejects.toThrow(
      "1 unpaid or undelivered order",
    );
    expect(await Customer.findByPk(customer.customerId)).not.toBeNull();
  });

  it("should refuse while a paid order is still undelivered", async () => {
    const customer = await newCustomer();
    const order = await newOrder(customer.customerId, OrderStatus.PENDING);
    await OrderService.makePayment(
      { paymentMethod: PaymentMethod.CASH },
      order!.orderId,
    );

    await expect(CustomerService.delete(customer.customerId)).rejects.toThrow(
      "undelivered order",
    );
  });

  it("should allow deletion when the only orders are cancelled", async () => {
    const customer = await newCustomer();
    const order = await newOrder(customer.customerId, OrderStatus.PENDING);
    await OrderService.updateStatus(order!.orderId, OrderStatus.CANCELLED, {
      userId: 1,
    });

    await expect(CustomerService.delete(customer.customerId)).resolves.toBe(
      true,
    );
  });

  it("should refuse while an invoice is open, listing every reason", async () => {
    const customer = await newCustomer();
    const order = await newOrder(customer.customerId);
    await InvoiceService.create(
      {
        customerId: customer.customerId,
        status: InvoiceStatus.UNPAID,
        items: [order!.orderId],
      },
      1,
    );
    await issue(customer.customerId);

    await expect(CustomerService.delete(customer.customerId)).rejects.toThrow(
      "Can't delete this customer: 1 unpaid or undelivered order, 1 open invoice, 1 container still out",
    );
  });

  it("should refuse while regular or temporary containers are out", async () => {
    const regular = await newCustomer();
    await issue(regular.customerId);
    await expect(CustomerService.delete(regular.customerId)).rejects.toThrow(
      "1 container still out",
    );

    const temporary = await newCustomer();
    await issue(temporary.customerId, EquipmentActionType.TEMPORARY);
    await expect(CustomerService.delete(temporary.customerId)).rejects.toThrow(
      "1 container still out",
    );
  });

  it("should allow deletion once containers are returned", async () => {
    const customer = await newCustomer();
    await issue(customer.customerId);
    await issue(customer.customerId, EquipmentActionType.RETURNED);

    await expect(CustomerService.delete(customer.customerId)).resolves.toBe(
      true,
    );
  });

  it("should never delete the walk-in account", async () => {
    const walkIn = await CustomerService.getOrCreateWalkIn();

    await expect(CustomerService.delete(walkIn.customerId)).rejects.toThrow(
      "walk-in",
    );
  });

  it("should not issue containers to a deleted customer", async () => {
    const customer = await newCustomer();
    await CustomerService.delete(customer.customerId);

    await expect(issue(customer.customerId)).rejects.toThrow(
      "Customer not found",
    );
  });

  it("should keep the name on settled records after deletion", async () => {
    const customer = await newCustomer();
    const order = await newOrder(customer.customerId);
    const invoice = await InvoiceService.create(
      {
        customerId: customer.customerId,
        status: InvoiceStatus.UNPAID,
        items: [order!.orderId],
      },
      1,
    );
    await InvoiceService.payInvoice(
      {
        invoiceId: invoice.invoiceId,
        paymentAmount: order!.totalAmount,
        paymentMethod: PaymentMethod.CASH,
      },
      1,
    );

    await CustomerService.delete(customer.customerId);

    const savedInvoice = await InvoiceService.get(invoice.invoiceId);
    expect(savedInvoice?.customer?.name).toBe("Delete Check");

    const savedOrder = await OrderService.get(order!.orderId);
    expect(savedOrder?.customer?.name).toBe("Delete Check");

    const { rows: invoices } = await InvoiceService.getAll({ limit: 1000 });
    const listedInvoice = invoices.find(
      (row: any) => row.invoiceId === invoice.invoiceId,
    );
    expect(listedInvoice?.customer?.name).toBe("Delete Check");

    const { rows: orders } = await OrderService.getAll({ limit: 1000 });
    const listedOrder = orders.find(
      (row: any) => row.orderId === order!.orderId,
    );
    expect(listedOrder?.customer?.name).toBe("Delete Check");
  });
});
