import {
  EquipmentActionType,
  InventoryAdjustmentType,
} from "@/lib/definitions";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { CustomerEquipmentBalance } from "./CustomerEquipmentBalance";
import { CustomerSpecialPricing } from "./CustomerSpecialPricing";
import { EquipmentLog } from "./EquipmentLog";
import { InventoryAdjustment } from "./InventoryAdjustment";
import { Order } from "./Order";
import { OrderDetail } from "./OrderDetail";
import { ProductInventory } from "./ProductInventory";
import { User } from "./User";

Customer.hasMany(CustomerEquipmentBalance, {
  foreignKey: "customerId",
  as: "equipmentBalances",
});
CustomerEquipmentBalance.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

Customer.hasMany(EquipmentLog, {
  foreignKey: "customerId",
  as: "equipmentLogs",
});
EquipmentLog.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

EquipmentLog.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

ProductInventory.hasMany(CustomerEquipmentBalance, {
  foreignKey: "productId",
});
CustomerEquipmentBalance.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

Customer.hasMany(Order, { foreignKey: "customerId", as: "orders" });
Order.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

Order.hasMany(OrderDetail, { foreignKey: "orderId", as: "orderDetails" });
OrderDetail.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Order.belongsTo(User, { foreignKey: "createdBy", as: "user" });
User.hasMany(Order, { foreignKey: "createdBy", as: "orders" });

ProductInventory.hasMany(OrderDetail, {
  foreignKey: "productId",
  as: "orderDetails",
});
OrderDetail.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

Customer.hasMany(CustomerSpecialPricing, {
  foreignKey: "customerId",
  as: "specialPricings",
});
CustomerSpecialPricing.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

ProductInventory.hasMany(CustomerSpecialPricing, { foreignKey: "productId" });
CustomerSpecialPricing.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

ProductInventory.hasMany(InventoryAdjustment, { foreignKey: "productId" });
InventoryAdjustment.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

EquipmentLog.afterCreate(async (log, options) => {
  const transaction = options.transaction;
  const { actionType, customerId, productId, quantity } = log;

  const isTemporary =
    actionType === EquipmentActionType.TEMPORARY ||
    actionType === EquipmentActionType.TEMPORARY_RETURNED ||
    actionType === EquipmentActionType.TEMPORARY_LOST ||
    actionType === EquipmentActionType.TEMPORARY_DAMAGED;

  const balanceField = isTemporary ? "quantityTemporaryOwed" : "quantityOwed";

  // 1. Update Customer Equipment Balance if customer is associated
  if (customerId) {
    const isIssue =
      actionType === EquipmentActionType.ISSUE ||
      actionType === EquipmentActionType.TEMPORARY;

    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId, productId },
      transaction,
    });

    if (isIssue) {
      if (balance) {
        await balance.increment(balanceField, { by: quantity, transaction });
      } else {
        await CustomerEquipmentBalance.create(
          {
            customerId,
            productId,
            quantityOwed: isTemporary ? 0 : quantity,
            quantityTemporaryOwed: isTemporary ? quantity : 0,
          },
          { transaction },
        );
      }
    } else if (balance) {
      await balance.decrement(balanceField, { by: quantity, transaction });
    }
  }

  // 2. Update Product Inventory Stock
  if (
    actionType === EquipmentActionType.ISSUE ||
    actionType === EquipmentActionType.TEMPORARY
  ) {
    await ProductInventory.decrement("stockInStation", {
      by: quantity,
      where: { productId },
      transaction,
    });
    await ProductInventory.increment("stockWithCustomers", {
      by: quantity,
      where: { productId },
      transaction,
    });
  } else if (
    actionType === EquipmentActionType.RETURNED ||
    actionType === EquipmentActionType.TEMPORARY_RETURNED
  ) {
    await ProductInventory.increment("stockInStation", {
      by: quantity,
      where: { productId },
      transaction,
    });
    await ProductInventory.decrement("stockWithCustomers", {
      by: quantity,
      where: { productId },
      transaction,
    });
  } else {
    // LOST / DAMAGED / TEMPORARY_LOST / TEMPORARY_DAMAGED
    await ProductInventory.decrement("stockWithCustomers", {
      by: quantity,
      where: { productId },
      transaction,
    });

    const isDamaged =
      actionType === EquipmentActionType.DAMAGED ||
      actionType === EquipmentActionType.TEMPORARY_DAMAGED;

    const targetField = isDamaged ? "stockDamaged" : "stockLost";
    await ProductInventory.increment(targetField, {
      by: quantity,
      where: { productId },
      transaction,
    });
  }
});

InventoryAdjustment.afterCreate(async (adj, options) => {
  const transaction = options.transaction;

  if (adj.adjustmentType === InventoryAdjustmentType.STOCK_IN) {
    await ProductInventory.increment("stockInStation", {
      by: adj.quantity,
      where: { productId: adj.productId },
      transaction,
    });
  } else if (adj.adjustmentType === InventoryAdjustmentType.DECLARED_DAMAGED) {
    await ProductInventory.decrement("stockInStation", {
      by: adj.quantity,
      where: { productId: adj.productId },
      transaction,
    });
    await ProductInventory.increment("stockDamaged", {
      by: adj.quantity,
      where: { productId: adj.productId },
      transaction,
    });
  } else if (adj.adjustmentType === InventoryAdjustmentType.DECLARED_LOST) {
    await ProductInventory.decrement("stockInStation", {
      by: adj.quantity,
      where: { productId: adj.productId },
      transaction,
    });
    await ProductInventory.increment("stockLost", {
      by: adj.quantity,
      where: { productId: adj.productId },
      transaction,
    });
  }
});

export {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  EquipmentLog,
  InventoryAdjustment,
  Order,
  OrderDetail,
  ProductInventory,
  sequelize,
  User,
};
