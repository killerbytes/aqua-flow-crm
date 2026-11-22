import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adjustRetailStockAction,
  createRetailProductAction,
  createRetailSaleAction,
  getRetailProductsAction,
  updateRetailProductAction,
  voidRetailSaleAction,
} from "../../../src/backend/actions/retail.actions";
import * as authContext from "../../../src/backend/auth/context";
import {
  RetailProductService,
  RetailSaleService,
} from "../../../src/backend/services/retail.service";
import {
  PaymentMethod,
  RetailStockEntryType,
  UserRole,
} from "../../../src/lib/definitions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

const { ADMIN, MANAGER, CASHIER, DELIVERY } = UserRole;

const signInAs = (role: UserRole) =>
  vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
    user: { userId: 7, name: "Test", username: "test", role },
  });

const SALE = {
  items: [{ productId: 1, quantity: 2 }],
  discount: 20,
  paymentMethod: PaymentMethod.CASH,
};
const PRODUCT = { name: "Brand-new Round", basePrice: 250 };
const RESTOCK = {
  productId: 1,
  type: RetailStockEntryType.RESTOCK,
  quantity: 5,
};

const forbidden = { success: false, error: expect.stringMatching(/Forbidden/) };

describe("Unit - Retail Server Actions", () => {
  let sell: ReturnType<typeof vi.spyOn>;
  let voidSale: ReturnType<typeof vi.spyOn>;
  let adjust: ReturnType<typeof vi.spyOn>;
  let create: ReturnType<typeof vi.spyOn>;
  let update: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    sell = vi
      .spyOn(RetailSaleService, "create")
      .mockResolvedValue({ saleId: 1, customerId: 3 } as never);
    voidSale = vi
      .spyOn(RetailSaleService, "voidSale")
      .mockResolvedValue({ saleId: 1, customerId: 3 } as never);
    adjust = vi
      .spyOn(RetailProductService, "adjustStock")
      .mockResolvedValue({ entryId: 1 } as never);
    create = vi
      .spyOn(RetailProductService, "create")
      .mockResolvedValue({ productId: 1 } as never);
    update = vi
      .spyOn(RetailProductService, "update")
      .mockResolvedValue({ productId: 1 } as never);
    vi.spyOn(RetailProductService, "getAll").mockResolvedValue([]);
  });

  it("should refuse everything without a session", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue(null);

    expect((await getRetailProductsAction()).success).toBe(false);
    expect((await createRetailSaleAction(SALE)).success).toBe(false);
    expect(sell).not.toHaveBeenCalled();
  });

  it.each([ADMIN, MANAGER, CASHIER])(
    "should let %s list products and sell, as the signed-in user",
    async (role) => {
      signInAs(role);

      expect((await getRetailProductsAction()).success).toBe(true);
      expect((await createRetailSaleAction(SALE)).success).toBe(true);
      expect(sell).toHaveBeenCalledWith(SALE, 7);
    },
  );

  it("should refuse Delivery staff everything", async () => {
    signInAs(DELIVERY);

    expect(await getRetailProductsAction()).toMatchObject(forbidden);
    expect(await createRetailSaleAction(SALE)).toMatchObject(forbidden);
    expect(await voidRetailSaleAction(1, { reason: "Mistake" })).toMatchObject(forbidden);
    expect(await adjustRetailStockAction(RESTOCK)).toMatchObject(forbidden);
    expect(sell).not.toHaveBeenCalled();
  });

  it.each([ADMIN, MANAGER])(
    "should let %s void a sale, restock, and edit products",
    async (role) => {
      signInAs(role);

      expect((await voidRetailSaleAction(1, { reason: "Refund" })).success).toBe(true);
      expect(voidSale).toHaveBeenCalledWith(1, { reason: "Refund" }, 7);
      expect((await adjustRetailStockAction(RESTOCK)).success).toBe(true);
      expect(adjust).toHaveBeenCalledWith(RESTOCK, 7);
      expect((await createRetailProductAction(PRODUCT)).success).toBe(true);
      expect((await updateRetailProductAction(1, { basePrice: 260 })).success).toBe(true);
      expect(update).toHaveBeenCalledWith(1, { basePrice: 260 });
    },
  );

  it("should refuse a Cashier voiding, restocking, or editing products", async () => {
    signInAs(CASHIER);

    expect(await voidRetailSaleAction(1, { reason: "Refund" })).toMatchObject(forbidden);
    expect(await adjustRetailStockAction(RESTOCK)).toMatchObject(forbidden);
    expect(await createRetailProductAction(PRODUCT)).toMatchObject(forbidden);
    expect(await updateRetailProductAction(1, { basePrice: 1 })).toMatchObject(forbidden);
    expect(voidSale).not.toHaveBeenCalled();
    expect(adjust).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("should need a reason to void", async () => {
    signInAs(ADMIN);

    const res = await voidRetailSaleAction(1, { reason: " " });
    expect(res.success).toBe(false);
    expect(voidSale).not.toHaveBeenCalled();
  });

  it("should refuse a negative discount before reaching the service", async () => {
    signInAs(CASHIER);

    const res = await createRetailSaleAction({ ...SALE, discount: -1 });
    expect(res).toMatchObject({ success: false, fieldErrors: { discount: expect.any(Array) } });
    expect(sell).not.toHaveBeenCalled();
  });

  it("should need a reason to write stock off", async () => {
    signInAs(MANAGER);

    const res = await adjustRetailStockAction({
      ...RESTOCK,
      type: RetailStockEntryType.WRITE_OFF,
    });
    expect(res.success).toBe(false);
    expect(adjust).not.toHaveBeenCalled();
  });

  it("should pass service errors back as a failed response", async () => {
    signInAs(CASHIER);
    sell.mockRejectedValueOnce(new Error("Only 1 Round left in stock"));

    expect(await createRetailSaleAction(SALE)).toEqual({
      success: false,
      error: "Only 1 Round left in stock",
    });
  });
});
