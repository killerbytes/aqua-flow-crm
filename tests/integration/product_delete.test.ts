import { beforeAll, describe, expect, it } from "vitest";
import { ProductInventory } from "../../src/backend/models";
import {
  EquipmentService,
  InventoryService,
  OrderService,
  ProductService,
} from "../../src/backend/services";
import {
  EquipmentActionType,
  InventoryAdjustmentType,
  OrderStatus,
  PaymentStatus,
} from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

const USER_ID = 1;
const CUSTOMER_ID = 5;

const newProduct = async (name: string, stock = 10) => {
  const product = (await ProductService.create({ name, unitPrice: 35 }))!;
  if (stock > 0) {
    await InventoryService.createAdjustment(
      {
        productId: product.productId,
        adjustmentType: InventoryAdjustmentType.STOCK_IN,
        quantity: stock,
      },
      USER_ID,
    );
  }
  return product;
};

const logAction = (productId: number, actionType: string, quantity = 1) =>
  EquipmentService.logEquipment(
    { customerId: CUSTOMER_ID, productId, actionType, quantity },
    USER_ID,
  );

const orderOf = (productId: number, status: string) =>
  OrderService.create(
    {
      customerId: CUSTOMER_ID,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      items: [{ productId, quantity: 1 }],
    } as any,
    USER_ID,
  );

describe("Integration - Deleting Products", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should delete a product with only station stock", async () => {
    const product = await newProduct("Station Only");

    await expect(ProductService.delete(product.productId)).resolves.toBe(true);
    expect(await ProductInventory.findByPk(product.productId)).toBeNull();
  });

  it.each([
    ["regular", EquipmentActionType.ISSUE],
    ["temporary", EquipmentActionType.TEMPORARY],
  ])("should refuse while %s containers are with customers", async (_, action) => {
    const product = await newProduct(`Issued ${action}`);
    await logAction(product.productId, action, 2);

    await expect(ProductService.delete(product.productId)).rejects.toThrow(
      "2 units still with customers",
    );
    expect(await ProductInventory.findByPk(product.productId)).not.toBeNull();
  });

  it("should allow deletion once containers are returned", async () => {
    const product = await newProduct("Returned");
    await logAction(product.productId, EquipmentActionType.ISSUE);
    await logAction(product.productId, EquipmentActionType.RETURNED);

    await expect(ProductService.delete(product.productId)).resolves.toBe(true);
  });

  it.each([OrderStatus.PENDING, OrderStatus.OUT_FOR_DELIVERY])(
    "should refuse while a %s order includes it",
    async (status) => {
      const product = await newProduct(`Ordered ${status}`);
      const order = await orderOf(product.productId, OrderStatus.PENDING);
      if (status === OrderStatus.OUT_FOR_DELIVERY) {
        await OrderService.updateStatus(order!.orderId, status, { userId: USER_ID });
      }

      await expect(ProductService.delete(product.productId)).rejects.toThrow(
        "1 undelivered order",
      );
    },
  );

  it("should not be blocked by delivered or cancelled orders", async () => {
    const product = await newProduct("Past Orders");
    await orderOf(product.productId, OrderStatus.DELIVERED);
    const cancelled = await orderOf(product.productId, OrderStatus.PENDING);
    await OrderService.updateStatus(cancelled!.orderId, OrderStatus.CANCELLED, {
      userId: USER_ID,
    });

    await expect(ProductService.delete(product.productId)).resolves.toBe(true);
  });

  it("should list every reason", async () => {
    const product = await newProduct("Everything");
    await logAction(product.productId, EquipmentActionType.ISSUE);
    await orderOf(product.productId, OrderStatus.PENDING);

    await expect(ProductService.delete(product.productId)).rejects.toThrow(
      "Can't delete this product: 1 unit still with customers, 1 undelivered order",
    );
  });

  it("should keep the name on past orders after deletion", async () => {
    const product = await newProduct("Kept Name");
    const order = await orderOf(product.productId, OrderStatus.DELIVERED);

    await ProductService.delete(product.productId);

    const saved = await OrderService.get(order!.orderId);
    expect(saved?.orderDetails[0].product?.name).toBe("Kept Name");
  });

  it("should refuse new orders and movements for a deleted product", async () => {
    const product = await newProduct("Gone");
    await ProductService.delete(product.productId);

    await expect(orderOf(product.productId, OrderStatus.PENDING)).rejects.toThrow(
      /not found/,
    );
    await expect(
      logAction(product.productId, EquipmentActionType.ISSUE),
    ).rejects.toThrow(/not found/);
  });

  it("should report a missing product", async () => {
    await expect(ProductService.delete(999999)).rejects.toThrow("Product not found");
  });
});
