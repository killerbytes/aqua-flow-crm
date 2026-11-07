import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createAdjustmentAction,
  createProductAction,
  updateProductAction,
} from "../../src/backend/actions/product.actions";
import * as authContext from "../../src/backend/auth/context";
import { EquipmentLedgerEntry, ProductInventory } from "../../src/backend/models";
import {
  EquipmentService,
  InventoryService,
  ProductService,
} from "../../src/backend/services";
import {
  EquipmentActionType,
  InventoryAdjustmentType,
  UserRole,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USER_ID = 1;

const newProduct = async (name: string) =>
  (await ProductService.create({ name, unitPrice: 35 }))!;

const stockIn = (productId: number, quantity: number) =>
  InventoryService.createAdjustment(
    {
      productId,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity,
      reason: "Delivery from supplier",
    },
    USER_ID,
  );

const balanceFor = async (productId: number) =>
  (await EquipmentService.getBalanceSheetReport()).find(
    (row) => row.productId === productId,
  )!;

describe("Integration - Stock Goes Through the Ledger", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("product create and update", () => {
    it.each([
      ["stockInStation", 50],
      ["stockWithCustomers", 5],
      ["stockDamaged", 1],
      ["stockLost", 1],
    ])("should refuse %s when creating", async (field, value) => {
      await expect(
        ProductService.create({ name: "Stocked", unitPrice: 35, [field]: value }),
      ).rejects.toThrow(/stock adjustment/);
    });

    it("should refuse stock when updating, and leave the product unchanged", async () => {
      const product = await newProduct("Update Check");
      await stockIn(product.productId, 10);

      await expect(
        ProductService.update(product.productId, {
          name: "Renamed",
          stockInStation: 999,
        }),
      ).rejects.toThrow(/stock adjustment/);

      const saved = await ProductInventory.findByPk(product.productId);
      expect(saved?.name).toBe("Update Check");
      expect(saved?.stockInStation).toBe(10);
    });

    it("should still update name and price", async () => {
      const product = await newProduct("Details Check");

      const updated = await ProductService.update(product.productId, {
        name: "Details Checked",
        unitPrice: 40,
      });

      expect(updated?.name).toBe("Details Checked");
      expect(updated?.unitPrice).toBe(40);
    });

    it("should start new products with no stock", async () => {
      const product = await newProduct("Empty Start");
      expect(product.stockInStation).toBe(0);
      expect(product.stockWithCustomers).toBe(0);
    });

    it("should refuse stock sent to the actions", async () => {
      vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
        user: { userId: USER_ID, name: "Admin", username: "admin", role: UserRole.ADMIN },
      });
      const product = await newProduct("Action Check");

      const created = await createProductAction({
        name: "Action Stocked",
        unitPrice: 35,
        stockInStation: 50,
      });
      expect(created).toMatchObject({ success: false });

      const updated = await updateProductAction(product.productId, {
        stockInStation: 50,
      });
      expect(updated).toMatchObject({ success: false });
    });
  });

  describe("who made a change", () => {
    it("should record the user on a stock adjustment", async () => {
      const product = await newProduct("Adjusted By");
      const entry = await stockIn(product.productId, 5);

      expect(entry.loggedBy).toBe(USER_ID);
    });

    it("should record the signed-in user through the action", async () => {
      vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
        user: { userId: 2, name: "Manager", username: "manager", role: UserRole.MANAGER },
      });
      const product = await newProduct("Adjusted Through Action");

      const res = await createAdjustmentAction({
        productId: product.productId,
        adjustmentType: InventoryAdjustmentType.STOCK_IN,
        quantity: 3,
      });

      expect(res.success).toBe(true);
      const entry = await EquipmentLedgerEntry.findOne({
        where: { productId: product.productId },
      });
      expect(entry?.loggedBy).toBe(2);
    });

    it("should show who logged each movement, without password hashes", async () => {
      const product = await newProduct("Logged Movements");
      await stockIn(product.productId, 5);
      await EquipmentService.logEquipment(
        {
          customerId: 1,
          productId: product.productId,
          actionType: EquipmentActionType.ISSUE,
          quantity: 1,
        },
        USER_ID,
      );

      const { rows } = await EquipmentService.getAll({
        query: { productId: product.productId },
      });

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.user?.userId).toBe(USER_ID);
        expect(row.user).not.toHaveProperty("passwordHash");
      }
    });
  });

  describe("balance sheet ledger check", () => {
    it("should match when every movement went through the ledger", async () => {
      const product = await newProduct("Balanced");
      await stockIn(product.productId, 10);
      await EquipmentService.logEquipment(
        {
          customerId: 1,
          productId: product.productId,
          actionType: EquipmentActionType.ISSUE,
          quantity: 3,
        },
        USER_ID,
      );
      await EquipmentService.logEquipment(
        {
          customerId: 1,
          productId: product.productId,
          actionType: EquipmentActionType.TEMPORARY,
          quantity: 2,
        },
        USER_ID,
      );
      await InventoryService.createAdjustment(
        {
          productId: product.productId,
          adjustmentType: InventoryAdjustmentType.DECLARED_DAMAGED,
          quantity: 1,
        },
        USER_ID,
      );

      const row = await balanceFor(product.productId);

      expect(row.matchesLedger).toBe(true);
      expect(row.stationStock).toBe(4);
      expect(row.customerOwed).toBe(5);
      expect(row.scrapDamaged).toBe(1);
    });

    it("should flag totals changed outside the ledger", async () => {
      const product = await newProduct("Drifted");
      await stockIn(product.productId, 10);

      await ProductInventory.update(
        { stockInStation: 25 },
        { where: { productId: product.productId } },
      );

      const row = await balanceFor(product.productId);
      expect(row.matchesLedger).toBe(false);
      expect(row.stationStock).toBe(25);
      expect(row.ledger.stationStock).toBe(10);
    });

    it("should match for every seeded product", async () => {
      const report = await EquipmentService.getBalanceSheetReport();
      const seeded = report.filter((row) => row.productId <= 3);

      expect(seeded.length).toBe(3);
      expect(seeded.every((row) => row.matchesLedger)).toBe(true);
    });
  });
});
