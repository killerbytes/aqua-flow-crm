import {
  Customer,
  CustomerSpecialPricing,
  ProductInventory,
  User,
  sequelize,
} from "@/backend/models";
import { CustomerStatus, UserRole } from "@/lib/definitions";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Integration - Soft Delete (Paranoid Models)", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await CustomerSpecialPricing.destroy({ truncate: true, force: true });
    await Customer.destroy({ truncate: true, force: true });
    await ProductInventory.destroy({ truncate: true, force: true });
    await User.destroy({ truncate: true, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("should soft delete a Customer and exclude it from standard queries but allow paranoid: false queries", async () => {
    const customer = await Customer.create({
      name: "Acma Water Station",
      address: "123 Main St",
      phone: "09170001122",
      status: CustomerStatus.ACTIVE,
      notes: "Test customer",
    });

    expect(customer.deletedAt).toBeFalsy();

    // Soft delete
    await customer.destroy();

    // Re-fetch customer using standard query
    const foundStandard = await Customer.findByPk(customer.customerId);
    expect(foundStandard).toBeNull();

    // Re-fetch customer using paranoid: false
    const foundWithDeleted = await Customer.findByPk(customer.customerId, {
      paranoid: false,
    });
    expect(foundWithDeleted).not.toBeNull();
    expect(foundWithDeleted?.name).toBe("Acma Water Station");
    expect(foundWithDeleted?.deletedAt).toBeInstanceOf(Date);

    // Restore customer
    await foundWithDeleted?.restore();

    const restoredCustomer = await Customer.findByPk(customer.customerId);
    expect(restoredCustomer).not.toBeNull();
    expect(restoredCustomer?.deletedAt).toBeNull();
  });

  it("should soft delete a ProductInventory item and maintain historical access", async () => {
    const product = await ProductInventory.create({
      name: "5 Gallon Round Container",
      stockInStation: 50,
      stockWithCustomers: 10,
      unitPrice: 35.0,
    });

    await product.destroy();

    const foundStandard = await ProductInventory.findByPk(product.productId);
    expect(foundStandard).toBeNull();

    const foundWithDeleted = await ProductInventory.findByPk(product.productId, {
      paranoid: false,
    });
    expect(foundWithDeleted).not.toBeNull();
    expect(foundWithDeleted?.name).toBe("5 Gallon Round Container");
  });

  it("should soft delete a User and keep entity reference for audit trails", async () => {
    const user = await User.create({
      name: "Cashier John",
      username: "john_cashier",
      passwordHash: "hashed_pass",
      role: UserRole.CASHIER,
      isActive: true,
    });

    await user.destroy();

    const foundStandard = await User.findByPk(user.userId);
    expect(foundStandard).toBeNull();

    const foundWithDeleted = await User.findByPk(user.userId, { paranoid: false });
    expect(foundWithDeleted).not.toBeNull();
    expect(foundWithDeleted?.name).toBe("Cashier John");
  });

  it("should soft delete a CustomerSpecialPricing rule", async () => {
    const customer = await Customer.create({
      name: "Special Pricing Customer",
      address: "456 Side St",
      status: CustomerStatus.ACTIVE,
    });
    const product = await ProductInventory.create({
      name: "Refill Slim Container",
      unitPrice: 30.0,
    });

    const pricing = await CustomerSpecialPricing.create({
      customerId: customer.customerId,
      productId: product.productId,
      discountAmount: 5.0,
    });

    await pricing.destroy();

    const foundStandard = await CustomerSpecialPricing.findByPk(pricing.pricingId);
    expect(foundStandard).toBeNull();

    const foundWithDeleted = await CustomerSpecialPricing.findByPk(
      pricing.pricingId,
      { paranoid: false },
    );
    expect(foundWithDeleted).not.toBeNull();
    expect(foundWithDeleted?.discountAmount).toBe(5.0);
  });
});
