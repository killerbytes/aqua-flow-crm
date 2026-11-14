import { beforeAll, describe, expect, it } from "vitest";
import { CustomerEquipmentBalance } from "../../src/backend/models/CustomerEquipmentBalance";
import { ProductInventory } from "../../src/backend/models/ProductInventory";
import { CustomerService } from "../../src/backend/services/customer.service";
import { EquipmentService } from "../../src/backend/services/equipment.service";
import { EquipmentLedgerEntry } from "../../src/backend/models";
import { Customer } from "../../src/backend/models/Customer";
import {
  CustomerStatus,
  EquipmentActionType,
  LedgerAccountType,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Equipment Service & Double-Entry Ledger", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("Customer Equipment Balance Tracking", () => {
    it("should update quantityTemporaryOwed on TEMPORARY and TEMPORARY_RETURNED without affecting quantityOwed", async () => {
      const customerId = 1;
      const productId = 1;

      let balances = await CustomerService.getCustomerBalances(customerId);
      let targetBalance = balances.find((b: any) => b.productId === productId);
      const initialOwed = targetBalance?.quantityOwed ?? 0;
      const initialTemp = targetBalance?.quantityTemporaryOwed ?? 0;

      // 1. Log TEMPORARY container issue (+5 temporary containers)
      await EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.TEMPORARY,
          quantity: 5,
        },
        1,
      );

      balances = await CustomerService.getCustomerBalances(customerId);
      targetBalance = balances.find((b: any) => b.productId === productId);

      expect(targetBalance?.quantityTemporaryOwed).toBe(initialTemp + 5);
      expect(targetBalance?.quantityOwed).toBe(initialOwed);

      // 2. Log TEMPORARY_RETURNED container return (-2 temporary containers)
      await EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.TEMPORARY_RETURNED,
          quantity: 2,
        },
        1,
      );

      balances = await CustomerService.getCustomerBalances(customerId);
      targetBalance = balances.find((b: any) => b.productId === productId);

      expect(targetBalance?.quantityTemporaryOwed).toBe(initialTemp + 5 - 2);
      expect(targetBalance?.quantityOwed).toBe(initialOwed);
    });

    it("should throw a validation error when attempting to TEMPORARY_RETURNED more temporary containers than currently borrowed", async () => {
      const customerId = 2;
      const productId = 1;

      await expect(
        EquipmentService.logEquipment(
          {
            customerId,
            productId,
            actionType: EquipmentActionType.TEMPORARY_RETURNED,
            quantity: 100,
          },
          1,
        ),
      ).rejects.toThrow(/Cannot return 100 temporary container\(s\)/i);
    });

    it("should throw a validation error when attempting to RETURNED more regular containers than currently owed", async () => {
      const customerId = 2;
      const productId = 1;

      await expect(
        EquipmentService.logEquipment(
          {
            customerId,
            productId,
            actionType: EquipmentActionType.RETURNED,
            quantity: 10,
          },
          1,
        ),
      ).rejects.toThrow(/Cannot return 10 container\(s\)/i);
    });
  });

  describe("Lost & Damaged Equipment Operations", () => {
    it("should log LOST for regular containers and update quantityOwed and stockLost", async () => {
      const customerId = 1;
      const productId = 1;

      await EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.ISSUE,
          quantity: 5,
          notes: "Issuing 5 containers for test",
        },
        1,
      );

      const initialBalance = await CustomerEquipmentBalance.findOne({
        where: { customerId, productId },
      });
      const initialProduct = await ProductInventory.findByPk(productId);

      const initialOwed = initialBalance?.quantityOwed ?? 0;
      const initialStockLost = initialProduct?.stockLost ?? 0;

      await EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.LOST,
          quantity: 2,
          notes: "2 containers lost by customer",
        },
        1,
      );

      const updatedBalance = await CustomerEquipmentBalance.findOne({
        where: { customerId, productId },
      });
      const updatedProduct = await ProductInventory.findByPk(productId);

      expect(updatedBalance?.quantityOwed).toBe(initialOwed - 2);
      expect(updatedProduct?.stockLost).toBe(initialStockLost + 2);
    });
  });

  describe("Inactive customers", () => {
    const log = (customerId: number, actionType: EquipmentActionType) =>
      EquipmentService.logEquipment(
        { customerId, productId: 1, actionType, quantity: 1 },
        1,
      );

    const newInactiveCustomer = async (name: string) => {
      const customer = await CustomerService.create({
        name,
        address: "400 Inactive Street",
        phone: "",
        status: CustomerStatus.INACTIVE,
      });
      return customer.customerId;
    };

    it.each([EquipmentActionType.ISSUE, EquipmentActionType.TEMPORARY])(
      "should refuse %s to an inactive customer",
      async (actionType) => {
        const customerId = await newInactiveCustomer(`Inactive ${actionType}`);
        const before = await ProductInventory.findByPk(1);

        await expect(log(customerId, actionType)).rejects.toThrow(
          "Can't give equipment to an inactive customer",
        );

        const after = await ProductInventory.findByPk(1);
        expect(after?.stockInStation).toBe(before?.stockInStation);
        expect(
          await CustomerEquipmentBalance.count({ where: { customerId } }),
        ).toBe(0);
      },
    );

    it("should still let equipment already out come back", async () => {
      // Set inactive behind the service's back, as older records may be.
      const customer = await CustomerService.create({
        name: "Inactive Legacy Holder",
        address: "401 Inactive Street",
        phone: "",
        status: CustomerStatus.ACTIVE,
      });
      await EquipmentLedgerEntry.create({
        productId: 1,
        fromAccountType: LedgerAccountType.SUPPLIER,
        toAccountType: LedgerAccountType.STATION,
        quantity: 2,
        loggedBy: 1,
      });
      await log(customer.customerId, EquipmentActionType.ISSUE);
      await log(customer.customerId, EquipmentActionType.TEMPORARY);
      await Customer.update(
        { status: CustomerStatus.INACTIVE },
        { where: { customerId: customer.customerId } },
      );

      await log(customer.customerId, EquipmentActionType.RETURNED);
      await log(customer.customerId, EquipmentActionType.TEMPORARY_LOST);

      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: customer.customerId, productId: 1 },
      });
      expect(balance?.quantityOwed).toBe(0);
      expect(balance?.quantityTemporaryOwed).toBe(0);
    });
  });

  describe("Stock Validation & Station Limits", () => {
    it("should reject issuing equipment when requested quantity exceeds stockInStation", async () => {
      const customerId = 1;
      const productId = 3;

      await expect(
        EquipmentService.logEquipment(
          {
            customerId,
            productId,
            actionType: EquipmentActionType.ISSUE,
            quantity: 9999,
          },
          1,
        ),
      ).rejects.toThrow(/Cannot issue 9999 container\(s\)/i);
    });
  });

  describe("Pattern 1 System Reports & Audits", () => {
    it("should generate System Inventory Balance Sheet Report", async () => {
      const report = await EquipmentService.getBalanceSheetReport();
      expect(report).toBeDefined();
      expect(Array.isArray(report)).toBe(true);
      expect(report.length).toBeGreaterThan(0);
      expect(report[0]).toHaveProperty("productId");
      expect(report[0]).toHaveProperty("stationStock");
      expect(report[0]).toHaveProperty("customerOwed");
      expect(report[0]).toHaveProperty("totalFleet");
    });
  });
});
