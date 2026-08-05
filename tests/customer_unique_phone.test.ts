import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase } from "../src/backend/db/database";
import { seedDatabase } from "../src/backend/db/seed";
import { CustomerService } from "../src/backend/services/customer.service";
import { CustomerStatus } from "../src/lib/definitions";

describe("Customer Unique Phone Error Handling", () => {
  beforeAll(async () => {
    await initDatabase();
    await seedDatabase({ clean: true, testCount: 5 });
  });

  it("should throw a user-friendly error when creating customer with duplicate phone number", async () => {
    const customer1 = await CustomerService.create({
      name: "Phone Test User 1",
      address: "123 Street",
      phone: "+639991112233",
      status: CustomerStatus.ACTIVE,
    });

    expect(customer1).toBeDefined();

    await expect(
      CustomerService.create({
        name: "Phone Test User 2",
        address: "456 Street",
        phone: "+639991112233",
        status: CustomerStatus.ACTIVE,
      }),
    ).rejects.toThrow(/phone number already exists/i);
  });
});
