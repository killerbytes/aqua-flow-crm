import { describe, expect, it, beforeAll } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { CustomerService } from "../src/backend/services/customer.service";
import { EquipmentActionType } from "../src/lib/definitions";

describe("Customer Equipment Balance Logic & Validation", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

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
      1
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
      1
    );

    balances = await CustomerService.getCustomerBalances(customerId);
    targetBalance = balances.find((b: any) => b.productId === productId);

    // TEMPORARY_RETURNED should ONLY decrease quantityTemporaryOwed (by 2) and NOT touch quantityOwed
    expect(targetBalance?.quantityTemporaryOwed).toBe(initialTemp + 5 - 2);
    expect(targetBalance?.quantityOwed).toBe(initialOwed);
  });

  it("should throw a validation error when attempting to TEMPORARY_RETURNED more temporary containers than currently borrowed", async () => {
    const customerId = 2; // Customer 2 has 1 temporary container borrowed
    const productId = 1;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.TEMPORARY_RETURNED,
          quantity: 100,
        },
        1
      )
    ).rejects.toThrow("Cannot return 100 temporary container(s). Customer only has 1 temporary container(s) borrowed.");
  });

  it("should throw a validation error when attempting to RETURNED more regular containers than currently owed", async () => {
    const customerId = 2; // Customer 2 owes 0 regular containers
    const productId = 1;

    await expect(
      EquipmentService.logEquipment(
        {
          customerId,
          productId,
          actionType: EquipmentActionType.RETURNED,
          quantity: 10,
        },
        1
      )
    ).rejects.toThrow("Cannot return 10 container(s). Customer only owes 0 container(s).");
  });
});
