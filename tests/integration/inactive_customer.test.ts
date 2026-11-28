import { beforeAll, describe, expect, it } from "vitest";
import { Customer, Invoice, Order, RetailSale } from "../../src/backend/models";
import {
  CustomerService,
  InvoiceService,
  OrderService,
  RetailProductService,
  RetailSaleService,
} from "../../src/backend/services";
import {
  CustomerStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RetailStockEntryType,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const WEEK = 7 * 24 * 60 * 60 * 1000;

const placeOrder = (customerId: number, status: string = OrderStatus.PENDING) =>
  OrderService.create(
    {
      customerId,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId: 1, quantity: 1 }],
    },
    1,
  );

const setInactive = (customerId: number) =>
  Customer.update(
    { status: CustomerStatus.INACTIVE },
    { where: { customerId } },
  );

const newCustomer = async (name: string) =>
  (await CustomerService.create({ name, address: "500 Inactive Street", phone: "" }))!
    .customerId;

describe("Integration - Inactive customers", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should refuse a new order", async () => {
    const customerId = await newCustomer("Inactive Orderer");
    await setInactive(customerId);

    await expect(placeOrder(customerId)).rejects.toThrow(
      "Can't create an order for an inactive customer",
    );
    expect(await Order.count({ where: { customerId } })).toBe(0);
  });

  it("should still let a pending order be edited", async () => {
    const customerId = await newCustomer("Inactive Editor");
    const order = await placeOrder(customerId);
    await setInactive(customerId);

    const updated = await OrderService.update(order.orderId, {
      items: [{ productId: 1, quantity: 3 }],
    });
    expect(updated.orderDetails?.[0]?.quantity).toBe(3);
  });

  it("should refuse a new invoice", async () => {
    const customerId = await newCustomer("Inactive Invoicee");
    const order = await placeOrder(customerId, OrderStatus.DELIVERED);
    await setInactive(customerId);

    await expect(
      InvoiceService.create(
        {
          customerId,
          dateIssued: new Date(),
          dueDate: new Date(Date.now() + WEEK),
          status: InvoiceStatus.UNPAID,
          items: [order.orderId],
        },
        1,
      ),
    ).rejects.toThrow("Can't create an invoice for an inactive customer");
    expect(await Invoice.count({ where: { customerId } })).toBe(0);
  });

  it("should refuse a retail sale to them but not a walk-in sale", async () => {
    const customerId = await newCustomer("Inactive Shopper");
    await setInactive(customerId);
    const product = (await RetailProductService.create({
      name: "Inactive Test Jug",
      basePrice: 200,
    }))!;
    await RetailProductService.adjustStock(
      { productId: product.productId, type: RetailStockEntryType.RESTOCK, quantity: 5 },
      1,
    );
    const sale = (extra: Record<string, unknown> = {}) =>
      RetailSaleService.create(
        {
          items: [{ productId: product.productId, quantity: 1 }],
          paymentMethod: PaymentMethod.CASH,
          ...extra,
        },
        1,
      );

    await expect(sale({ customerId })).rejects.toThrow(
      "Can't sell to an inactive customer",
    );
    expect(await RetailSale.count({ where: { customerId } })).toBe(0);
    await expect(sale()).resolves.toBeDefined();
  });
});
