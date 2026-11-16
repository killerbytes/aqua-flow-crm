import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdjustmentAction,
  createProductAction,
  deleteProductAction,
  getProductsAction,
  updateProductAction,
} from "../../../src/backend/actions/product.actions";
import { InventoryService } from "../../../src/backend/services/inventory.service";
import { ProductService } from "../../../src/backend/services/product.service";
import {
  InventoryAdjustmentType,
  UserRole,
} from "../../../src/lib/definitions";
import { signInAs } from "../../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/backend/services/inventory.service");
vi.mock("../../../src/backend/services/product.service");

type Resolved<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

// Who may run each action is covered in action_permissions.test.ts.
describe("Unit - Product Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(UserRole.MANAGER, 5);
  });

  it("should return the product list", async () => {
    const products = [{ productId: 1, name: "Water Container" }] as Resolved<
      typeof ProductService.getAll
    >;
    vi.mocked(ProductService.getAll).mockResolvedValue(products);

    expect(await getProductsAction()).toEqual({ success: true, data: products });
  });

  it("should create a product and refresh the product page", async () => {
    const input = { name: "New Jug", unitPrice: 150 };

    const res = await createProductAction(input);

    expect(res.success).toBe(true);
    expect(ProductService.create).toHaveBeenCalledWith(input);
    expect(revalidatePath).toHaveBeenCalledWith("/products");
  });

  it("should refuse a product with a negative price", async () => {
    const res = await createProductAction({ name: "New Jug", unitPrice: -1 });

    expect(res).toMatchObject({ success: false, error: "Validation failed" });
    expect(ProductService.create).not.toHaveBeenCalled();
  });

  it("should pass the id and the changes to update", async () => {
    await updateProductAction(3, { unitPrice: 40 });

    expect(ProductService.update).toHaveBeenCalledWith(3, { unitPrice: 40 });
    expect(revalidatePath).toHaveBeenCalledWith("/products");
  });

  it("should report why a product can't be deleted", async () => {
    vi.mocked(ProductService.delete).mockRejectedValue(
      new Error("Can't delete this product: 4 containers with customers"),
    );

    expect(await deleteProductAction(3)).toEqual({
      success: false,
      error: "Can't delete this product: 4 containers with customers",
    });
  });

  it("should record a stock adjustment as the signed-in user", async () => {
    const input = {
      productId: 1,
      adjustmentType: InventoryAdjustmentType.STOCK_IN,
      quantity: 10,
    };

    const res = await createAdjustmentAction(input);

    expect(res.success).toBe(true);
    expect(InventoryService.createAdjustment).toHaveBeenCalledWith(input, 5);
  });

  it.each([0, -3, 1.5])(
    "should refuse a stock adjustment of %s",
    async (quantity) => {
      const res = await createAdjustmentAction({
        productId: 1,
        adjustmentType: InventoryAdjustmentType.STOCK_IN,
        quantity,
      });

      expect(res).toMatchObject({ success: false, error: "Validation failed" });
      expect(InventoryService.createAdjustment).not.toHaveBeenCalled();
    },
  );
});
