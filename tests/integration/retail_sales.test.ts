import { beforeAll, describe, expect, it } from "vitest";
import {
  Customer,
  RetailProduct,
  RetailSale,
  RetailSaleItem,
  RetailStockEntry,
} from "../../src/backend/models";
import {
  CustomerService,
  RetailProductService,
  RetailSaleService,
  WALK_IN_CUSTOMER_NAME,
} from "../../src/backend/services";
import {
  PaymentMethod,
  RetailStockEntryType,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;

const newProduct = async (name: string, basePrice = 250, stock = 10) => {
  const product = (await RetailProductService.create({ name, basePrice }))!;
  if (stock > 0) await restock(product.productId, stock);
  return product;
};

const restock = (productId: number, quantity: number) =>
  RetailProductService.adjustStock(
    { productId, type: RetailStockEntryType.RESTOCK, quantity, notes: "Supplier" },
    USER_ID,
  );

const stockOf = async (productId: number) =>
  (await RetailProduct.findByPk(productId))!.stockOnHand;

const entriesTotal = async (productId: number) =>
  (await RetailStockEntry.findAll({ where: { productId } })).reduce(
    (sum, entry) => sum + entry.quantityChange,
    0,
  );

const sell = (
  items: { productId: number; quantity: number }[],
  extra: Record<string, unknown> = {},
) =>
  RetailSaleService.create(
    { items, paymentMethod: PaymentMethod.CASH, ...extra },
    USER_ID,
  );

describe("Integration - Retail Sales", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("catalog", () => {
    it("should start a new product with no stock", async () => {
      const product = (await RetailProductService.create({
        name: "Empty Shelf",
        basePrice: 99.5,
      }))!;
      expect(product.stockOnHand).toBe(0);
      expect(product.basePrice).toBe(99.5);
    });

    it("should refuse stock on create and update, leaving the product unchanged", async () => {
      await expect(
        RetailProductService.create({ name: "Stocked", basePrice: 1, stockOnHand: 50 }),
      ).rejects.toThrow(/restock or write-off/);

      const product = await newProduct("No Stock Edits", 250, 3);
      await expect(
        RetailProductService.update(product.productId, { stockOnHand: 99 }),
      ).rejects.toThrow(/restock or write-off/);
      expect(await stockOf(product.productId)).toBe(3);
    });

    it("should update the name, base price, and low stock warning", async () => {
      const product = await newProduct("Old Name", 200, 0);
      const updated = await RetailProductService.update(product.productId, {
        name: "New Name",
        basePrice: 230,
        lowStockThreshold: 4,
      });
      expect(updated).toMatchObject({
        name: "New Name",
        basePrice: 230,
        lowStockThreshold: 4,
      });
    });

    it("should refuse a negative price", async () => {
      await expect(
        RetailProductService.create({ name: "Negative", basePrice: -1 }),
      ).rejects.toThrow();
    });
  });

  describe("stock adjustments", () => {
    it("should add a restock and record who did it", async () => {
      const product = await newProduct("Restocked", 250, 0);
      const entry = await restock(product.productId, 12);

      expect(entry).toMatchObject({
        type: RetailStockEntryType.RESTOCK,
        quantityChange: 12,
        loggedBy: USER_ID,
      });
      expect(await stockOf(product.productId)).toBe(12);
    });

    it("should write off damaged units, with a reason", async () => {
      const product = await newProduct("Written Off", 250, 5);
      await RetailProductService.adjustStock(
        {
          productId: product.productId,
          type: RetailStockEntryType.WRITE_OFF,
          quantity: 2,
          notes: "Cracked in storage",
        },
        USER_ID,
      );
      expect(await stockOf(product.productId)).toBe(3);
    });

    it("should refuse a write-off without a reason, or larger than the stock", async () => {
      const product = await newProduct("Short Write-off", 250, 2);
      const writeOff = (quantity: number, notes?: string) =>
        RetailProductService.adjustStock(
          {
            productId: product.productId,
            type: RetailStockEntryType.WRITE_OFF,
            quantity,
            notes,
          },
          USER_ID,
        );

      await expect(writeOff(1)).rejects.toThrow();
      await expect(writeOff(3, "Lost")).rejects.toThrow(/Only 2/);
      expect(await stockOf(product.productId)).toBe(2);
    });

    it("should refuse sale and void entries made by hand", async () => {
      const product = await newProduct("Hand Entry", 250, 2);
      await expect(
        RetailProductService.adjustStock(
          { productId: product.productId, type: RetailStockEntryType.SALE, quantity: 1 },
          USER_ID,
        ),
      ).rejects.toThrow();
    });
  });

  describe("selling", () => {
    it("should price from the database, take the discount, and deduct the stock", async () => {
      const round = await newProduct("Sale Round", 250, 10);
      const slim = await newProduct("Sale Slim", 219.95, 10);

      const sale = await sell(
        [
          // A price in the request is ignored.
          { productId: round.productId, quantity: 2, unitPrice: 1 } as never,
          { productId: slim.productId, quantity: 1 },
        ],
        { discount: 20.1, paymentMethod: PaymentMethod.GCASH, paymentNotes: " ref 123 " },
      );

      expect(sale).toMatchObject({
        subtotal: 719.95,
        discount: 20.1,
        totalAmount: 699.85,
        paymentMethod: PaymentMethod.GCASH,
        paymentNotes: "ref 123",
        soldBy: USER_ID,
        voidedAt: null,
      });
      expect(sale.items?.map((item) => [item.productId, item.quantity, item.unitPrice])).toEqual([
        [round.productId, 2, 250],
        [slim.productId, 1, 219.95],
      ]);
      expect(await stockOf(round.productId)).toBe(8);
      expect(await stockOf(slim.productId)).toBe(9);

      const entries = await RetailStockEntry.findAll({ where: { saleId: sale.saleId } });
      expect(entries.map((e) => [e.type, e.quantityChange])).toEqual(
        expect.arrayContaining([
          [RetailStockEntryType.SALE, -2],
          [RetailStockEntryType.SALE, -1],
        ]),
      );
    });

    it("should keep the price a sale was made at when the base price changes", async () => {
      const product = await newProduct("Repriced", 250, 5);
      const sale = await sell([{ productId: product.productId, quantity: 1 }]);
      await RetailProductService.update(product.productId, { basePrice: 300 });

      const again = await RetailSaleService.get(sale.saleId);
      expect(again?.items?.[0].unitPrice).toBe(250);
      expect(again?.totalAmount).toBe(250);
    });

    it("should go on the walk-in account without a customer", async () => {
      const product = await newProduct("Walk-in Item");
      const sale = await sell([{ productId: product.productId, quantity: 1 }]);

      expect(sale.customer?.name).toBe(WALK_IN_CUSTOMER_NAME);
    });

    it("should go on the customer chosen", async () => {
      const product = await newProduct("Customer Item");
      const buyer = (await CustomerService.create({
        name: "Retail Buyer",
        address: "123 Test Street",
        phone: "",
      }))!;

      const sale = await sell([{ productId: product.productId, quantity: 1 }], {
        customerId: buyer.customerId,
      });
      expect(sale.customerId).toBe(buyer.customerId);

      const page = await RetailSaleService.getAll({
        query: { customerId: buyer.customerId },
      });
      expect(page.rows.map((row) => row.saleId)).toEqual([sale.saleId]);
    });

    it("should refuse a customer that doesn't exist", async () => {
      const product = await newProduct("No Customer");
      await expect(
        sell([{ productId: product.productId, quantity: 1 }], { customerId: 999999 }),
      ).rejects.toThrow(/not found/);
      expect(await stockOf(product.productId)).toBe(10);
    });

    it("should merge lines for the same product", async () => {
      const product = await newProduct("Merged", 100, 10);
      const sale = await sell([
        { productId: product.productId, quantity: 2 },
        { productId: product.productId, quantity: 3 },
      ]);

      expect(sale.items).toHaveLength(1);
      expect(sale.items?.[0].quantity).toBe(5);
      expect(sale.subtotal).toBe(500);
      expect(await stockOf(product.productId)).toBe(5);
    });

    it("should refuse more than is in stock, and save nothing", async () => {
      const plenty = await newProduct("Plenty", 100, 10);
      const scarce = await newProduct("Scarce", 100, 1);
      const salesBefore = await RetailSale.count();

      await expect(
        sell([
          { productId: plenty.productId, quantity: 2 },
          { productId: scarce.productId, quantity: 2 },
        ]),
      ).rejects.toThrow(/Only 1 Scarce left/);

      expect(await RetailSale.count()).toBe(salesBefore);
      expect(await stockOf(plenty.productId)).toBe(10);
      expect(await stockOf(scarce.productId)).toBe(1);
    });

    it("should refuse a discount over the subtotal, or below zero", async () => {
      const product = await newProduct("Discounted", 100, 5);

      await expect(
        sell([{ productId: product.productId, quantity: 1 }], { discount: 100.01 }),
      ).rejects.toThrow(/more than the subtotal/);
      await expect(
        sell([{ productId: product.productId, quantity: 1 }], { discount: -5 }),
      ).rejects.toThrow();
      expect(await stockOf(product.productId)).toBe(5);

      // The whole subtotal can be taken off.
      const free = await sell([{ productId: product.productId, quantity: 1 }], {
        discount: 100,
      });
      expect(free.totalAmount).toBe(0);
    });

    it("should refuse a sale with no items or no payment method", async () => {
      const product = await newProduct("Incomplete");
      await expect(sell([])).rejects.toThrow();
      await expect(
        RetailSaleService.create(
          { items: [{ productId: product.productId, quantity: 1 }] },
          USER_ID,
        ),
      ).rejects.toThrow();
    });
  });

  describe("voiding", () => {
    it("should return the units to stock and record who voided it and why", async () => {
      const product = await newProduct("Voided Item", 250, 4);
      const sale = await sell([{ productId: product.productId, quantity: 3 }]);
      expect(await stockOf(product.productId)).toBe(1);

      const voided = await RetailSaleService.voidSale(
        sale.saleId,
        { reason: "Customer changed their mind" },
        USER_ID,
      );

      expect(voided.voidedAt).toBeInstanceOf(Date);
      expect(voided).toMatchObject({
        voidedBy: USER_ID,
        voidReason: "Customer changed their mind",
      });
      expect(await stockOf(product.productId)).toBe(4);
      // The sale and its lines stay on record.
      expect(await RetailSaleItem.count({ where: { saleId: sale.saleId } })).toBe(1);
    });

    it("should refuse voiding twice, so stock isn't returned twice", async () => {
      const product = await newProduct("Twice Voided", 250, 2);
      const sale = await sell([{ productId: product.productId, quantity: 1 }]);
      await RetailSaleService.voidSale(sale.saleId, { reason: "Mistake" }, USER_ID);

      await expect(
        RetailSaleService.voidSale(sale.saleId, { reason: "Again" }, USER_ID),
      ).rejects.toThrow(/already been voided/);
      expect(await stockOf(product.productId)).toBe(2);
    });

    it("should need a reason", async () => {
      const product = await newProduct("Reasonless", 250, 2);
      const sale = await sell([{ productId: product.productId, quantity: 1 }]);

      await expect(
        RetailSaleService.voidSale(sale.saleId, { reason: " " }, USER_ID),
      ).rejects.toThrow();
      expect((await RetailSale.findByPk(sale.saleId))!.voidedAt).toBeNull();
    });

    it("should leave voided sales out of the list's totals", async () => {
      const buyer = await Customer.create({ name: "Totals Buyer", address: "1 Test St" });
      const product = await newProduct("Totals Item", 100, 5);
      await sell([{ productId: product.productId, quantity: 1 }], {
        customerId: buyer.customerId,
        discount: 10,
      });
      const voided = await sell([{ productId: product.productId, quantity: 2 }], {
        customerId: buyer.customerId,
      });
      await RetailSaleService.voidSale(voided.saleId, { reason: "Mistake" }, USER_ID);

      const page = await RetailSaleService.getAll({
        query: { customerId: buyer.customerId },
      });
      expect(page.rows).toHaveLength(2);
      expect(page.summary).toEqual({ sales: 1, total: 90, discounts: 10 });
    });
  });

  it("should always keep the stored stock equal to its entries", async () => {
    const product = await newProduct("Invariant", 100, 10);
    const sale = await sell([{ productId: product.productId, quantity: 4 }]);
    await RetailProductService.adjustStock(
      {
        productId: product.productId,
        type: RetailStockEntryType.WRITE_OFF,
        quantity: 1,
        notes: "Dropped",
      },
      USER_ID,
    );
    await RetailSaleService.voidSale(sale.saleId, { reason: "Refund" }, USER_ID);

    expect(await stockOf(product.productId)).toBe(9);
    expect(await entriesTotal(product.productId)).toBe(9);

    for (const seeded of await RetailProduct.findAll()) {
      expect(await entriesTotal(seeded.productId)).toBe(seeded.stockOnHand);
    }
  });
});
