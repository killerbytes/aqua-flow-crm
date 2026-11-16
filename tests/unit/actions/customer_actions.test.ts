import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCustomerAction,
  deleteCustomerAction,
  deleteSpecialPricingAction,
  logEquipmentAction,
  lookupCustomerAction,
  setSpecialPricingAction,
} from "../../../src/backend/actions/customer.actions";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { EquipmentService } from "../../../src/backend/services/equipment.service";
import { EquipmentActionType, UserRole } from "../../../src/lib/definitions";
import { signInAs } from "../../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/backend/services/customer.service");
vi.mock("../../../src/backend/services/equipment.service");

type Resolved<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

// Who may run each action is covered in action_permissions.test.ts.
describe("Unit - Customer Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(UserRole.CASHIER, 7);
  });

  it("should create a customer and refresh the list", async () => {
    const created = { customerId: 10, name: "Jane Smith" } as Resolved<
      typeof CustomerService.create
    >;
    vi.mocked(CustomerService.create).mockResolvedValue(created);
    const input = {
      name: "Jane Smith",
      address: "456 Oak Avenue",
      phone: "09181234567",
    };

    const res = await createCustomerAction(input);

    expect(res).toEqual({ success: true, data: created });
    expect(CustomerService.create).toHaveBeenCalledWith(input);
    expect(revalidatePath).toHaveBeenCalledWith("/customers");
  });

  it("should return field errors without reaching the service", async () => {
    const res = await createCustomerAction({
      name: "J",
      address: "x",
      phone: "12345",
    });

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    if (!res.success) {
      expect(Object.keys(res.fieldErrors ?? {}).sort()).toEqual([
        "address",
        "name",
        "phone",
      ]);
    }
    expect(CustomerService.create).not.toHaveBeenCalled();
  });

  it("should turn a refused deletion into an error result, not a throw", async () => {
    signInAs(UserRole.ADMIN);
    vi.mocked(CustomerService.delete).mockRejectedValue(
      new Error("Can't delete this customer: 2 unpaid orders"),
    );

    const res = await deleteCustomerAction(10);

    expect(res).toEqual({
      success: false,
      error: "Can't delete this customer: 2 unpaid orders",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("should pass the search term and the active-only flag to lookup", async () => {
    vi.mocked(CustomerService.lookup).mockResolvedValue([]);

    await lookupCustomerAction("juan", true);

    expect(CustomerService.lookup).toHaveBeenCalledWith("juan", true);
  });

  it("should log equipment as the signed-in user, not one named in the request", async () => {
    const input = {
      customerId: 1,
      productId: 2,
      actionType: EquipmentActionType.ISSUE,
      quantity: 3,
      loggedBy: 99,
    };

    const res = await logEquipmentAction(input);

    expect(res.success).toBe(true);
    expect(EquipmentService.logEquipment).toHaveBeenCalledWith(input, 7);
    expect(revalidatePath).toHaveBeenCalledWith("/products");
    expect(revalidatePath).toHaveBeenCalledWith("/customers");
  });

  it("should refuse an equipment log with no quantity", async () => {
    const res = await logEquipmentAction({
      customerId: 1,
      productId: 2,
      actionType: EquipmentActionType.ISSUE,
      quantity: 0,
    });

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    expect(EquipmentService.logEquipment).not.toHaveBeenCalled();
  });

  it("should refresh the customer's page when a special discount is set", async () => {
    const input = { customerId: 10, productId: 1, discountAmount: 5 };

    const res = await setSpecialPricingAction(input);

    expect(res.success).toBe(true);
    expect(CustomerService.setSpecialPricing).toHaveBeenCalledWith(input);
    expect(revalidatePath).toHaveBeenCalledWith("/customers/10");
  });

  it("should refresh the customer's page when a special discount is deleted", async () => {
    vi.mocked(CustomerService.deleteSpecialPricing).mockResolvedValue({
      pricingId: 4,
      customerId: 10,
    });

    const res = await deleteSpecialPricingAction(4);

    expect(res).toEqual({
      success: true,
      data: { pricingId: 4, customerId: 10 },
    });
    expect(CustomerService.deleteSpecialPricing).toHaveBeenCalledWith(4);
    expect(revalidatePath).toHaveBeenCalledWith("/customers/10");
  });
});
