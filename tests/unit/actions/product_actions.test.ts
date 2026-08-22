import { describe, expect, it, vi } from "vitest";
import * as authContext from "../../../src/backend/auth/context";
import { ProductService } from "../../../src/backend/services/product.service";
import { UserRole } from "../../../src/lib/definitions";
import {
  createProductAction,
  deleteProductAction,
  getProductsAction,
  updateProductAction,
} from "../../../src/backend/actions/product.actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../../src/backend/db/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/backend/db/database")>();
  return {
    ...actual,
    initDatabase: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Unit - Product Server Actions", () => {
  it("should fail getProductsAction when user is unauthenticated", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue(null);

    const res = await getProductsAction();
    expect(res.success).toBe(false);
  });

  it("should return products when authorized user calls getProductsAction", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);
    vi.spyOn(ProductService, "getAll").mockResolvedValue([{ productId: 1, name: "Water Container" }] as any);

    const res = await getProductsAction();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual([{ productId: 1, name: "Water Container" }]);
    }
  });

  it("should fail createProductAction for user without MANAGE_PRODUCTS permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 3, name: "Cashier", role: UserRole.CASHIER },
    } as any);

    const res = await createProductAction({
      name: "New Jug",
      unitPrice: 150,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Forbidden/i);
    }
  });

  it("should create product via createProductAction for Manager", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 2, name: "Manager", role: UserRole.MANAGER },
    } as any);
    vi.spyOn(ProductService, "create").mockResolvedValue({ productId: 5, name: "New Jug", unitPrice: 150 } as any);

    const res = await createProductAction({
      name: "New Jug",
      unitPrice: 150,
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ productId: 5, name: "New Jug", unitPrice: 150 });
    }
  });
});
