import { beforeAll, describe, expect, it } from "vitest";
import { CustomerSpecialPricing } from "../../src/backend/models";
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

  describe("Setting a customer inactive", () => {
    const newCustomer = (name: string) =>
      CustomerService.create({
        name,
        address: "300 Status Street",
        phone: "",
        status: CustomerStatus.ACTIVE,
      });

    const log = (customerId: number, actionType: EquipmentActionType) =>
      EquipmentService.logEquipment(
        { customerId, productId: 1, actionType, quantity: 1 },
        1,
      );

    const statusOf = async (customerId: number) =>
      (await Customer.findByPk(customerId))?.status;

    it.each([
      ["regular", EquipmentActionType.ISSUE, EquipmentActionType.RETURNED],
      [
        "temporary",
        EquipmentActionType.TEMPORARY,
        EquipmentActionType.TEMPORARY_RETURNED,
      ],
    ])(
      "should be refused while %s equipment is out, and allowed once it's back",
      async (kind, give, takeBack) => {
        const customer = await newCustomer(`Holder ${kind}`);
        await log(customer.customerId, give);

        await expect(
          CustomerService.update(customer.customerId, {
            status: CustomerStatus.INACTIVE,
          }),
        ).rejects.toThrow(
          "Can't set this customer to inactive: 1 container still out",
        );
        expect(await statusOf(customer.customerId)).toBe(CustomerStatus.ACTIVE);

        await log(customer.customerId, takeBack);
        const updated = await CustomerService.update(customer.customerId, {
          status: CustomerStatus.INACTIVE,
        });
        expect(updated.status).toBe(CustomerStatus.INACTIVE);
      },
    );

    it("should still allow other edits while equipment is out", async () => {
      const customer = await newCustomer("Holder Editing");
      await log(customer.customerId, EquipmentActionType.ISSUE);

      const updated = await CustomerService.update(customer.customerId, {
        address: "301 Status Street",
        status: CustomerStatus.ACTIVE,
      });
      expect(updated.address).toBe("301 Status Street");
    });

    it("should allow setting an inactive customer active again", async () => {
      const customer = await newCustomer("Returning Customer");
      await CustomerService.update(customer.customerId, {
        status: CustomerStatus.INACTIVE,
      });

      const updated = await CustomerService.update(customer.customerId, {
        status: CustomerStatus.ACTIVE,
      });
      expect(updated.status).toBe(CustomerStatus.ACTIVE);
    });
  });

  describe("Special Discounts", () => {
    it("should delete a special discount and allow setting it again", async () => {
      const customer = await CustomerService.create({
        name: "Discount Customer",
        address: "1 Discount St",
        phone: "+639170001111",
        status: CustomerStatus.ACTIVE,
      });
      const input = {
        customerId: customer.customerId,
        productId: 1,
        discountAmount: 5,
      };
      const pricing = await CustomerService.setSpecialPricing(input);

      const result = await CustomerService.deleteSpecialPricing(
        pricing.pricingId,
      );
      expect(result.customerId).toBe(customer.customerId);

      // Gone for good, not soft-deleted, so the unique index is free again.
      expect(
        await CustomerSpecialPricing.findByPk(pricing.pricingId, {
          paranoid: false,
        }),
      ).toBeNull();
      const after = await CustomerService.get(customer.customerId);
      expect(after.specialPricings).toHaveLength(0);

      const again = await CustomerService.setSpecialPricing({
        ...input,
        discountAmount: 10,
      });
      expect(Number(again.discountAmount)).toBe(10);
    });

    it("should refuse to delete a special discount that doesn't exist", async () => {
      await expect(CustomerService.deleteSpecialPricing(999999)).rejects.toThrow(
        "Special discount not found",
      );
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
  });
});
