import { beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../src/backend/db/seed";
import { CustomerService } from "../src/backend/services/customer.service";
import { CustomerStatus } from "../src/lib/definitions";
import { useUIStore } from "../src/store/uiStore";

describe("Edit Customer UI State & Service Mutation", () => {
  const refDate = new Date("2026-07-30T00:00:00Z");

  beforeAll(async () => {
    await seedDatabase({ isTest: true, refDate });
  });

  it("should update store state when editing a customer", () => {
    const customerData = {
      customerId: 1,
      name: "Maria Santos",
      address: "123 Sampaguita St",
      phone: "+63 917 123 4567",
      status: CustomerStatus.ACTIVE,
    };

    useUIStore.getState().setCustomerFormModalOpen(true, customerData as any);

    const state = useUIStore.getState();
    expect(state.isCustomerFormModalOpen).toBe(true);
    expect(state.editingCustomer?.name).toBe("Maria Santos");
  });

  it("should execute updateCustomer service mutation and persist changes", async () => {
    const updateInput = {
      name: "Maria Santos Updated",
      address: "456 Sampaguita St Ext",
      phone: "+63 917 999 8888",
      status: CustomerStatus.ACTIVE,
    };

    const updated = await CustomerService.update("1", updateInput);

    expect(updated).toBeDefined();
    expect(updated.name).toBe("Maria Santos Updated");
    expect(updated.phone).toBe("+63 917 999 8888");
  });
});
