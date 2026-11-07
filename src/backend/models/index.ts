import { LedgerAccountType } from "@/lib/definitions";
import { sequelize } from "../db/database";
import { Customer } from "./Customer";
import { CustomerEquipmentBalance } from "./CustomerEquipmentBalance";
import { CustomerSpecialPricing } from "./CustomerSpecialPricing";
import { EquipmentLedgerEntry } from "./EquipmentLedgerEntry";
import { Invoice } from "./Invoice";
import { InvoiceDetail } from "./InvoiceDetail";
import { InvoicePayment } from "./InvoicePayment";
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

Customer.hasMany(EquipmentLedgerEntry, {
  foreignKey: "fromAccountId",
  as: "outgoingLedgerEntries",
});
Customer.hasMany(EquipmentLedgerEntry, {
  foreignKey: "toAccountId",
  as: "incomingLedgerEntries",
});
EquipmentLedgerEntry.belongsTo(Customer, {
  foreignKey: "toAccountId",
  as: "customer",
});

EquipmentLedgerEntry.belongsTo(ProductInventory, {
  foreignKey: "productId",
  as: "product",
});

EquipmentLedgerEntry.belongsTo(User, {
  foreignKey: "loggedBy",
  as: "user",
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

Customer.hasMany(Invoice, { foreignKey: "customerId", as: "invoices" });
Invoice.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

Invoice.hasMany(InvoiceDetail, {
  foreignKey: "invoiceId",
  as: "invoiceDetails",
});
InvoiceDetail.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });
InvoiceDetail.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Invoice.hasMany(InvoicePayment, {
  foreignKey: "invoiceId",
  as: "invoicePayments",
});
InvoicePayment.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });

InvoicePayment.belongsTo(User, { foreignKey: "loggedBy", as: "user" });
InvoicePayment.belongsTo(User, {
  foreignKey: "reversedBy",
  as: "reversedByUser",
});
User.hasMany(InvoicePayment, { foreignKey: "loggedBy", as: "invoicePayments" });

Invoice.belongsTo(User, { foreignKey: "loggedBy", as: "user" });
Invoice.belongsTo(User, { foreignKey: "voidedBy", as: "voidedByUser" });
User.hasMany(Invoice, { foreignKey: "loggedBy", as: "invoices" });

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

ProductInventory.hasMany(EquipmentLedgerEntry, { foreignKey: "productId" });

// Pattern 1 Unified Double-Entry Equipment Ledger Hook
EquipmentLedgerEntry.afterCreate(async (entry, options) => {
  const transaction = options.transaction;
  const {
    productId,
    fromAccountType,
    fromAccountId,
    toAccountType,
    toAccountId,
    quantity,
  } = entry;

  // 1. Update Customer Equipment Balance (Regular Owed)
  if (toAccountType === LedgerAccountType.CUSTOMER && toAccountId) {
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: toAccountId, productId },
      transaction,
    });
    if (balance) {
      await balance.increment("quantityOwed", { by: quantity, transaction });
    } else {
      await CustomerEquipmentBalance.create(
        {
          customerId: toAccountId,
          productId,
          quantityOwed: quantity,
          quantityTemporaryOwed: 0,
        },
        { transaction },
      );
    }
  }
  if (fromAccountType === LedgerAccountType.CUSTOMER && fromAccountId) {
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: fromAccountId, productId },
      transaction,
    });
    if (balance) {
      await balance.decrement("quantityOwed", { by: quantity, transaction });
    }
  }

  // 2. Update Customer Equipment Balance (Temporary Owed)
  if (toAccountType === LedgerAccountType.CUSTOMER_TEMP && toAccountId) {
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: toAccountId, productId },
      transaction,
    });
    if (balance) {
      await balance.increment("quantityTemporaryOwed", {
        by: quantity,
        transaction,
      });
    } else {
      await CustomerEquipmentBalance.create(
        {
          customerId: toAccountId,
          productId,
          quantityOwed: 0,
          quantityTemporaryOwed: quantity,
        },
        { transaction },
      );
    }
  }
  if (fromAccountType === LedgerAccountType.CUSTOMER_TEMP && fromAccountId) {
    const balance = await CustomerEquipmentBalance.findOne({
      where: { customerId: fromAccountId, productId },
      transaction,
    });
    if (balance) {
      await balance.decrement("quantityTemporaryOwed", {
        by: quantity,
        transaction,
      });
    }
  }

  // 3. Update Product Station Stock
  if (toAccountType === LedgerAccountType.STATION) {
    await ProductInventory.increment("stockInStation", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }
  if (fromAccountType === LedgerAccountType.STATION) {
    await ProductInventory.decrement("stockInStation", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }

  // 4. Update Product Stock With Customers
  if (
    toAccountType === LedgerAccountType.CUSTOMER ||
    toAccountType === LedgerAccountType.CUSTOMER_TEMP
  ) {
    await ProductInventory.increment("stockWithCustomers", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }
  if (
    fromAccountType === LedgerAccountType.CUSTOMER ||
    fromAccountType === LedgerAccountType.CUSTOMER_TEMP
  ) {
    await ProductInventory.decrement("stockWithCustomers", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }

  // 5. Update Scrap Stock (Damaged / Lost)
  if (toAccountType === LedgerAccountType.SCRAP_DAMAGED) {
    await ProductInventory.increment("stockDamaged", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }
  if (toAccountType === LedgerAccountType.SCRAP_LOST) {
    await ProductInventory.increment("stockLost", {
      by: quantity,
      where: { productId },
      transaction,
    });
  }
});

export {
  Customer,
  CustomerEquipmentBalance,
  CustomerSpecialPricing,
  EquipmentLedgerEntry,
  Invoice,
  InvoiceDetail,
  InvoicePayment,
  Order,
  OrderDetail,
  ProductInventory,
  sequelize,
  User,
};
