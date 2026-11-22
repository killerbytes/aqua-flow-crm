import { beforeAll, describe, expect, it } from "vitest";
import {
  RetailProduct,
  RetailSale,
  RetailStockEntry,
  User,
} from "../../src/backend/models";
import { DashboardService } from "../../src/backend/services/dashboard.service";
import {
  FinanceReportService,
  parseDateRange,
  SALES_SOURCES,
  VOID_TYPES,
} from "../../src/backend/services/finance-report.service";
import {
  RetailProductService,
  RetailSaleService,
} from "../../src/backend/services/retail.service";
import {
  PaymentMethod,
  RetailStockEntryType,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;

const newProduct = async (
  name: string,
  basePrice: number,
  stock: number,
  lowStockThreshold: number | null = null,
) => {
  const product = (await RetailProductService.create({
    name,
    basePrice,
    lowStockThreshold,
  }))!;
  if (stock > 0) await adjust(product.productId, RetailStockEntryType.RESTOCK, stock);
  return product;
};

/** A restock or write-off, dated `at` when given. */
const adjust = async (
  productId: number,
  type: typeof RetailStockEntryType.RESTOCK | typeof RetailStockEntryType.WRITE_OFF,
  quantity: number,
  at?: string,
) => {
  const entry = await RetailProductService.adjustStock(
    { productId, type, quantity, notes: "Counted" },
    USER_ID,
  );
  if (at) {
    await RetailStockEntry.update(
      { createdAt: new Date(at) },
      { where: { entryId: entry.entryId } },
    );
  }
  return entry;
};

/** A sale made at `at`, with its stock movements dated the same. */
const sellAt = async (
  at: string,
  items: { productId: number; quantity: number }[],
  extra: Record<string, unknown> = {},
) => {
  const sale = await RetailSaleService.create(
    { items, paymentMethod: PaymentMethod.CASH, ...extra },
    USER_ID,
  );
  await RetailSale.update(
    { soldAt: new Date(at) },
    { where: { saleId: sale.saleId } },
  );
  await RetailStockEntry.update(
    { createdAt: new Date(at) },
    { where: { saleId: sale.saleId } },
  );
  return sale;
};

const voidAt = async (saleId: number, at: string, reason = "Mistake") => {
  await RetailSaleService.voidSale(saleId, { reason }, USER_ID);
  await RetailSale.update({ voidedAt: new Date(at) }, { where: { saleId } });
  await RetailStockEntry.update(
    { createdAt: new Date(at) },
    { where: { saleId, type: RetailStockEntryType.SALE_VOID } },
  );
};

describe("Integration - Retail in Daily Sales and Reports", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("dashboard", () => {
    // 10:00 on 15 May 2027 in Manila (UTC+8), well clear of the seed data.
    const NOW = new Date("2027-05-15T02:00:00Z");

    it("should add today's retail sales to today's sales and cash, by Philippine day", async () => {
      const product = await newProduct("Dash Round", 250, 20);
      const before = await DashboardService.getSummary(NOW);

      // 00:30 Manila on the 15th, which is still the 14th in UTC: counts.
      await sellAt("2027-05-14T16:30:00Z", [{ productId: product.productId, quantity: 1 }], {
        paymentMethod: PaymentMethod.GCASH,
      });
      // 23:30 Manila on the 14th: yesterday, so it doesn't.
      await sellAt("2027-05-14T15:30:00Z", [{ productId: product.productId, quantity: 1 }]);
      // Today, with a discount.
      await sellAt("2027-05-15T01:00:00Z", [{ productId: product.productId, quantity: 2 }], {
        discount: 50,
      });
      // Today, but voided.
      const voided = await sellAt("2027-05-15T01:30:00Z", [
        { productId: product.productId, quantity: 1 },
      ]);
      await voidAt(voided.saleId, "2027-05-15T01:45:00Z");

      const after = await DashboardService.getSummary(NOW);

      expect(after.today.retailCount - before.today.retailCount).toBe(2);
      expect(after.today.orderCount).toBe(before.today.orderCount);
      expect(after.today.sales - before.today.sales).toBeCloseTo(250 + 450, 2);

      expect(after.cash.paymentCount - before.cash.paymentCount).toBe(2);
      expect(after.cash.total - before.cash.total).toBeCloseTo(700, 2);
      expect(
        (after.cash.byMethod.GCASH ?? 0) - (before.cash.byMethod.GCASH ?? 0),
      ).toBeCloseTo(250, 2);
    });

    it("should put retail sales on their Philippine day in the trend", async () => {
      const product = await newProduct("Trend Slim", 200, 10);
      const before = await DashboardService.getSummary(NOW);
      const day = (summary: typeof before, date: string) =>
        summary.trend.find((d) => d.date === date)!;

      await sellAt("2027-05-10T04:00:00Z", [{ productId: product.productId, quantity: 3 }]);

      const after = await DashboardService.getSummary(NOW);
      expect(day(after, "2027-05-10").retailCount - day(before, "2027-05-10").retailCount).toBe(1);
      expect(day(after, "2027-05-10").sales - day(before, "2027-05-10").sales).toBeCloseTo(600, 2);
    });

    it("should list retail stock apart and flag it at or below its threshold", async () => {
      const low = await newProduct("Dash Low", 100, 3, 5);
      const fine = await newProduct("Dash Fine", 100, 6, 5);
      const unwatched = await newProduct("Dash Unwatched", 100, 0);

      const { stock } = await DashboardService.getSummary(NOW);
      const row = (productId: number) =>
        stock.retail.find((r) => r.productId === productId)!;

      expect(row(low.productId)).toMatchObject({ onHand: 3, isLow: true });
      expect(row(fine.productId).isLow).toBe(false);
      expect(row(unwatched.productId).isLow).toBe(false);
      // Refill products don't include them.
      expect(stock.products.some((p) => p.name === "Dash Low")).toBe(false);
    });
  });

  describe("sales report", () => {
    const JUNE = parseDateRange({ from: "2027-06-01", to: "2027-06-30" });

    it("should add retail sales by period, product, and payment, with discounts on their own line", async () => {
      const round = await newProduct("Report Round", 250, 10);
      const slim = await newProduct("Report Slim", 200, 10);

      await sellAt(
        "2027-06-02T02:00:00Z",
        [
          { productId: round.productId, quantity: 2 },
          { productId: slim.productId, quantity: 1 },
        ],
        { discount: 30, paymentMethod: PaymentMethod.GCASH },
      );
      await sellAt("2027-06-09T02:00:00Z", [{ productId: slim.productId, quantity: 1 }]);
      // Voided: in none of the figures.
      const voided = await sellAt("2027-06-09T03:00:00Z", [
        { productId: round.productId, quantity: 4 },
      ]);
      await voidAt(voided.saleId, "2027-06-09T04:00:00Z");

      const report = await FinanceReportService.getSales(JUNE, "day");

      expect(report.periods[1]).toMatchObject({ orders: 0, retailSales: 1, units: 3, sales: 670 });
      expect(report.periods[8]).toMatchObject({ retailSales: 1, units: 1, sales: 200 });
      expect(report.periodTotal).toMatchObject({ orders: 0, retailSales: 2, units: 4, sales: 870 });

      expect(report.products).toEqual([
        { source: SALES_SOURCES.RETAIL, productName: "Report Round", units: 2, sales: 500 },
        { source: SALES_SOURCES.RETAIL, productName: "Report Slim", units: 2, sales: 400 },
        { source: SALES_SOURCES.RETAIL, productName: "Retail Discounts", units: null, sales: -30 },
      ]);
      expect(report.productTotal).toEqual({
        source: null,
        productName: "Total",
        units: 4,
        sales: 870,
      });
      expect(report.productTotal.sales).toBe(report.periodTotal.sales);

      expect(report.collections).toEqual([
        { method: "Cash", payments: 1, fromOrders: 0, fromInvoices: 0, fromRetail: 200, total: 200 },
        { method: "GCash", payments: 1, fromOrders: 0, fromInvoices: 0, fromRetail: 670, total: 670 },
      ]);
      expect(report.collectionTotal).toMatchObject({ payments: 2, fromRetail: 870, total: 870 });
    });
  });

  describe("voids report", () => {
    const JULY = parseDateRange({ from: "2027-07-01", to: "2027-07-31" });

    it("should list a voided retail sale, and count it for the person who voided it", async () => {
      const product = await newProduct("Voids Item", 150, 5);
      const sale = await sellAt("2027-07-01T02:00:00Z", [
        { productId: product.productId, quantity: 2 },
      ]);
      await voidAt(sale.saleId, "2027-07-02T02:00:00Z", "Refunded");

      const report = await FinanceReportService.getVoidsAndReversals(JULY);
      const user = (await User.findByPk(USER_ID))!;

      expect(report.rows).toEqual([
        expect.objectContaining({
          type: VOID_TYPES.RETAIL_SALE_VOIDED,
          reference: `Retail sale #${sale.saleId}`,
          amount: 300,
          by: user.name,
          reason: "Refunded",
        }),
      ]);
      expect(
        report.byType.find((row) => row.type === VOID_TYPES.RETAIL_SALE_VOIDED),
      ).toMatchObject({ count: 1, amount: 300 });
      expect(report.byUser).toEqual([
        {
          by: user.name,
          role: user.role,
          ordersVoided: 0,
          ordersVoidedAmount: 0,
          invoicesVoided: 0,
          paymentsReversed: 0,
          retailSalesVoided: 1,
        },
      ]);
    });
  });

  describe("retail stock report", () => {
    const MAY_2028 = parseDateRange({ from: "2028-05-01", to: "2028-05-31" });

    it("should give each product's opening, movements, and closing for the range", async () => {
      const product = await newProduct("Stock Report Item", 100, 0);
      const id = product.productId;

      await adjust(id, RetailStockEntryType.RESTOCK, 10, "2028-04-20T02:00:00Z");
      // Midnight in Manila on 1 May is still 30 April in UTC: inside the range.
      await sellAt("2028-04-30T16:30:00Z", [{ productId: id, quantity: 3 }]);
      const voided = await sellAt("2028-05-10T02:00:00Z", [{ productId: id, quantity: 2 }]);
      await voidAt(voided.saleId, "2028-05-11T02:00:00Z");
      await adjust(id, RetailStockEntryType.WRITE_OFF, 1, "2028-05-15T02:00:00Z");
      await adjust(id, RetailStockEntryType.RESTOCK, 5, "2028-05-20T02:00:00Z");
      // After the range.
      await sellAt("2028-06-02T02:00:00Z", [{ productId: id, quantity: 1 }]);

      const report = await RetailProductService.getStockReport(MAY_2028);
      const row = report.rows.find((r) => r.productId === id)!;

      expect(row).toEqual({
        productId: id,
        productName: "Stock Report Item",
        opening: 10,
        restocked: 5,
        sold: 5,
        returned: 2,
        writtenOff: 1,
        closing: 11,
        onHandNow: 10,
        matchesEntries: true,
      });

      const log = report.log.filter((entry) => entry.productName === "Stock Report Item");
      expect(log.map((entry) => [entry.type, entry.change])).toEqual([
        ["Sold", -3],
        ["Sold", -2],
        ["Returned (sale voided)", 2],
        ["Written off", -1],
        ["Restock", 5],
      ]);
      expect(log[1].reference).toBe(`Retail sale #${voided.saleId}`);

      expect(report.total.closing).toBe(
        report.rows.reduce((sum, r) => sum + r.closing, 0),
      );
    });

    it("should flag a product whose stored count drifted from its entries", async () => {
      const product = await newProduct("Drifted Item", 100, 4);
      await RetailProduct.increment("stockOnHand", {
        by: 2,
        where: { productId: product.productId },
      });

      const report = await RetailProductService.getStockReport(MAY_2028);
      expect(
        report.rows.find((r) => r.productId === product.productId)?.matchesEntries,
      ).toBe(false);
      expect(report.total.matchesEntries).toBe(false);

      await RetailProduct.decrement("stockOnHand", {
        by: 2,
        where: { productId: product.productId },
      });
    });
  });
});
