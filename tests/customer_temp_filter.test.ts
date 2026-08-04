import { beforeAll, describe, expect, it } from "vitest";
import { Customer } from "../src/backend/models/Customer";
import { CustomerEquipmentBalance } from "../src/backend/models/CustomerEquipmentBalance";
import { CustomerService } from "../src/backend/services/customer.service";
import { EquipmentService } from "../src/backend/services/equipment.service";
import { CustomerStatus, EquipmentActionType } from "../src/lib/definitions";
import { seedDatabase } from "../src/backend/db/seed";

describe("Customer Temporary Equipment Filtering TDD Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should filter customers with unreturned temporary equipment using CustomerService.getAll", async () => {
    // Create customer A with temporary borrowed equipment
    const custA = await Customer.create({
      name: "Temp Customer A",
      phone: "+63 917 111 8888",
      address: "111 Temp St",
      status: CustomerStatus.ACTIVE,
    });

    await EquipmentService.logEquipment(
      {
        customerId: custA.customerId,
        productId: 1,
        actionType: EquipmentActionType.TEMPORARY,
        quantity: 2,
        notes: "Lending 2 temp containers",
      },
      1
    );

    // Create customer B without temporary equipment
    await Customer.create({
      name: "No Temp Customer B",
      phone: "+63 917 222 8888",
      address: "222 Regular St",
      status: CustomerStatus.ACTIVE,
    });

    const result = await CustomerService.getAll({
      query: { withTemporaryBalanceOnly: true },
    });

    const foundA = result.rows.find((c: any) => c.customerId === custA.customerId);
    const foundB = result.rows.find((c: any) => c.name === "No Temp Customer B");

    expect(foundA).toBeDefined();
    expect(foundB).toBeUndefined();
  });

  it("should retrieve customers with temporary equipment via CustomerService.getWithTemporaryBalance", async () => {
    const list = await CustomerService.getWithTemporaryBalance();
    expect(list.length).toBeGreaterThan(0);
    const found = list.find((c: any) => c.name === "Temp Customer A");
    expect(found).toBeDefined();
  });
});
