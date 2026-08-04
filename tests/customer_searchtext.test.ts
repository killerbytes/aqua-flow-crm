import { beforeAll, describe, expect, it } from "vitest";
import { Customer } from "../src/backend/models/Customer";
import { CustomerService } from "../src/backend/services/customer.service";
import { CustomerStatus } from "../src/lib/definitions";
import { seedDatabase } from "../src/backend/db/seed";

describe("Customer searchText TDD Tests", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should auto-generate searchText on customer creation with name, phone, address, barangay name, and notes", async () => {
    const customer = await Customer.create({
      name: "Juan Techie",
      phone: "+63 917 555 9999",
      address: "789 Technology St",
      barangayId: "034903002", // "Aduas Centro (Aduas)"
      notes: "Requires morning delivery",
      status: CustomerStatus.ACTIVE,
    });

    expect(customer.searchText).toBeDefined();
    expect(customer.searchText).toContain("Juan Techie");
    expect(customer.searchText).toContain("+63 917 555 9999");
    expect(customer.searchText).toContain("789 Technology St");
    expect(customer.searchText).toContain("Aduas Centro");
    expect(customer.searchText).toContain("Requires morning delivery");
  });

  it("should update searchText when customer address or barangayId is updated", async () => {
    const customer = await Customer.create({
      name: "Pedro Penduko",
      phone: "+63 918 222 3333",
      address: "100 Initial St",
      barangayId: "034903003", // "Bagong Sikat"
      notes: "Initial note",
      status: CustomerStatus.ACTIVE,
    });

    await customer.update({
      address: "200 Updated St",
      barangayId: "034903005", // "Bagong Buhay"
      notes: "Updated note",
    });

    expect(customer.searchText).toContain("200 Updated St");
    expect(customer.searchText).toContain("Bagong Buhay");
    expect(customer.searchText).toContain("Updated note");
  });

  it("should find customers by barangay name using CustomerService.getAll", async () => {
    await Customer.create({
      name: "Barangay Search Customer",
      phone: "+63 999 111 2222",
      address: "555 Market St",
      barangayId: "034903006", // "Bakero"
      notes: "Special wholesale account",
      status: CustomerStatus.ACTIVE,
    });

    const result = await CustomerService.getAll({
      query: { term: "Bakero" },
    });

    expect(result.rows.length).toBeGreaterThan(0);
    const found = result.rows.find((c: any) => c.name === "Barangay Search Customer");
    expect(found).toBeDefined();
  });

  it("should find customers by notes using CustomerService.lookup", async () => {
    await Customer.create({
      name: "Notes Search Customer",
      phone: "+63 988 777 6666",
      address: "777 Quiet St",
      barangayId: "034903007", // "Bakod Bayan"
      notes: "Prefers invoice via email",
      status: CustomerStatus.ACTIVE,
    });

    const results = await CustomerService.lookup("invoice via email", true);
    expect(results.length).toBeGreaterThan(0);
    const found = results.find((c: any) => c.name === "Notes Search Customer");
    expect(found).toBeDefined();
  });
});
