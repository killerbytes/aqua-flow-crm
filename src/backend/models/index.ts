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
InventoryAdjustment.belongsTo(ProductInventory, { foreignKey: "productId" });

EquipmentLog.afterCreate(async (log, options) => {
  const transaction = options.transaction;

  if (log.actionType === EquipmentActionType.ISSUE) {
    if (log.customerId) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: log.customerId, productId: log.productId },
        transaction,
      });
      if (balance) {
        await balance.increment("quantityOwed", {
          by: log.quantity,
          transaction,
        });
      } else {
        await CustomerEquipmentBalance.create(
          {
            customerId: log.customerId,
            productId: log.productId,
            quantityOwed: log.quantity,
            quantityTemporaryOwed: 0,
          },
          { transaction },
        );
      }
    }

    await ProductInventory.decrement("stockInStation", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
    await ProductInventory.increment("stockWithCustomers", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
  } else if (log.actionType === EquipmentActionType.RETURNED) {
    if (log.customerId) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: log.customerId, productId: log.productId },
        transaction,
      });
      if (balance) {
        await balance.decrement("quantityOwed", {
          by: log.quantity,
          transaction,
        });
      }
    }

    await ProductInventory.increment("stockInStation", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
    await ProductInventory.decrement("stockWithCustomers", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
  } else if (log.actionType === EquipmentActionType.TEMPORARY) {
    if (log.customerId) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: log.customerId, productId: log.productId },
        transaction,
      });
      if (balance) {
        await balance.increment("quantityTemporaryOwed", {
          by: log.quantity,
          transaction,
        });
      } else {
        await CustomerEquipmentBalance.create(
          {
            customerId: log.customerId,
            productId: log.productId,
            quantityOwed: 0,
            quantityTemporaryOwed: log.quantity,
          },
          { transaction },
        );
      }
    }

    await ProductInventory.decrement("stockInStation", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
    await ProductInventory.increment("stockWithCustomers", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
  } else if (log.actionType === EquipmentActionType.TEMPORARY_RETURNED) {
    if (log.customerId) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: log.customerId, productId: log.productId },
        transaction,
      });
      if (balance) {
        await balance.decrement("quantityTemporaryOwed", {
          by: log.quantity,
          transaction,
        });
      }
    }

    await ProductInventory.increment("stockInStation", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
    await ProductInventory.decrement("stockWithCustomers", {
      by: log.quantity,
      where: { productId: log.productId },
      transaction,
    });
  } else if (
    log.actionType === EquipmentActionType.LOST ||
    log.actionType === EquipmentActionType.DAMAGED
  ) {
    if (log.customerId) {
      const balance = await CustomerEquipmentBalance.findOne({
        where: { customerId: log.customerId, productId: log.productId },
        transaction,
      });
      if (balance) {
        await balance.decrement("quantityOwed", {
          by: log.quantity,
          transaction,
        });
      }
    }

    await ProductInventory.decrement("stockWithCustomers", {
      by: log.quantity,
      where: { productId: log.productId },
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
    await ProductInventory.decrement("stockWithCustomers", {
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
