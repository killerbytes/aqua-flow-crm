import { beforeAll, describe, expect, it } from "vitest";
import { Customer } from "../../src/backend/models/Customer";
import { CustomerService } from "../../src/backend/services/customer.service";
import { EquipmentService } from "../../src/backend/services/equipment.service";
import { CustomerStatus, EquipmentActionType } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Customer Service & Queries", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe("Customer CRUD & Unique Constraints", () => {
    it("should throw a user-friendly error when creating customer with duplicate phone number", async () => {
      const customer1 = await CustomerService.create({
        name: "Phone Test User 1",
        address: "123 Unique Street",
        phone: "+639991112233",
        status: CustomerStatus.ACTIVE,
      });

      expect(customer1).toBeDefined();

      await expect(
        CustomerService.create({
          name: "Phone Test User 2",
          address: "456 Unique Street",
          phone: "+639991112233",
          status: CustomerStatus.ACTIVE,
        }),
      ).rejects.toThrow(/phone number already exists/i);
    });

    it("should edit existing customer details successfully", async () => {
      const customer = await CustomerService.create({
        name: "Editable Customer",
        address: "100 Initial Address",
        phone: "+639178889900",
        status: CustomerStatus.ACTIVE,
      });

      const updated = await CustomerService.update(customer.customerId, {
        name: "Edited Customer Name",
        address: "200 Updated Address",
      });

      expect(updated.name).toBe("Edited Customer Name");
      expect(updated.address).toBe("200 Updated Address");
    });
  });

  describe("Search & Auto-Generated SearchText", () => {
    it("should auto-generate searchText on customer creation", async () => {
      const customer = await Customer.create({
        name: "Juan Techie",
        phone: "+63 917 555 9999",
        address: "789 Technology St",
        barangayId: "034903002",
        notes: "Requires morning delivery",
        status: CustomerStatus.ACTIVE,
      });

      expect(customer.searchText).toBeDefined();
      expect(customer.searchText).toContain("Juan Techie");
      expect(customer.searchText).toContain("+63 917 555 9999");
      expect(customer.searchText).toContain("789 Technology St");
      expect(customer.searchText).toContain("Requires morning delivery");
    });

    it("should update searchText when customer address or notes change", async () => {
      const customer = await Customer.create({
        name: "Pedro Penduko",
        phone: "+63 918 222 3333",
        address: "100 Initial St",
        barangayId: "034903003",
        notes: "Initial note",
        status: CustomerStatus.ACTIVE,
      });

      await customer.update({
        address: "200 Updated St",
        notes: "Updated note",
      });

      expect(customer.searchText).toContain("200 Updated St");
      expect(customer.searchText).toContain("Updated note");
    });

    it("should lookup customers by term using CustomerService.lookup", async () => {
      await Customer.create({
        name: "Notes Search Customer",
        phone: "+63 988 777 6666",
        address: "777 Quiet St",
        notes: "Prefers invoice via email",
        status: CustomerStatus.ACTIVE,
      });

      const results = await CustomerService.lookup("invoice via email", true);
      expect(results.length).toBeGreaterThan(0);
      const found = results.find(
        (c: any) => c.name === "Notes Search Customer",
      );
      expect(found).toBeDefined();
    });
  });

  describe("Temporary Equipment Filtering", () => {
    it("should filter customers with unreturned temporary equipment", async () => {
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
        1,
      );

      const result = await CustomerService.getAll({
        query: { withTemporaryBalanceOnly: true },
      });

      const foundA = result.rows.find(
        (c: any) => c.customerId === custA.customerId,
      );

      expect(foundA).toBeDefined();
    });

    it("should retrieve customers with temporary equipment via getWithTemporaryBalance", async () => {
      const list = await CustomerService.getWithTemporaryBalance();
      expect(list.length).toBeGreaterThan(0);
    });
  });
});
