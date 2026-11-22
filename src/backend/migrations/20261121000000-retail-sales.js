"use strict";

const timestamps = (Sequelize) => ({
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    field: "created_at",
  },
  updatedAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    field: "updated_at",
  },
});

/**
 * Retail: brand-new items (such as new 5-gallon containers) sold over the
 * counter, apart from refill orders. Only new tables, so it is safe to apply
 * while the previous version is still serving.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "retail_products",
        {
          productId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            field: "product_id",
          },
          name: { type: Sequelize.STRING, allowNull: false },
          basePrice: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            field: "base_price",
          },
          // Changes only through retail_stock_entries.
          stockOnHand: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: "stock_on_hand",
          },
          lowStockThreshold: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: "low_stock_threshold",
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );

      // Paid in full when recorded, so the payment is on the sale itself.
      await queryInterface.createTable(
        "retail_sales",
        {
          saleId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            field: "sale_id",
          },
          customerId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "customer_id",
            references: { model: "customers", key: "customer_id" },
          },
          subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
          discount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          totalAmount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            field: "total_amount",
          },
          paymentMethod: {
            type: Sequelize.STRING,
            allowNull: false,
            field: "payment_method",
          },
          paymentNotes: {
            type: Sequelize.TEXT,
            allowNull: true,
            field: "payment_notes",
          },
          soldAt: { type: Sequelize.DATE, allowNull: false, field: "sold_at" },
          soldBy: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "sold_by",
            references: { model: "users", key: "user_id" },
          },
          voidedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            field: "voided_at",
          },
          voidedBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: "voided_by",
            references: { model: "users", key: "user_id" },
          },
          voidReason: {
            type: Sequelize.TEXT,
            allowNull: true,
            field: "void_reason",
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.addIndex("retail_sales", ["sold_at"], {
        name: "idx_retail_sales_sold_at",
        transaction,
      });
      await queryInterface.addIndex("retail_sales", ["customer_id"], {
        name: "idx_retail_sales_customer_id",
        transaction,
      });

      await queryInterface.createTable(
        "retail_sale_items",
        {
          itemId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            field: "item_id",
          },
          saleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "sale_id",
            references: { model: "retail_sales", key: "sale_id" },
          },
          productId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "product_id",
            references: { model: "retail_products", key: "product_id" },
          },
          quantity: { type: Sequelize.INTEGER, allowNull: false },
          // The base price when it was sold.
          unitPrice: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            field: "unit_price",
          },
        },
        { transaction },
      );
      await queryInterface.addIndex("retail_sale_items", ["sale_id"], {
        name: "idx_retail_sale_items_sale_id",
        transaction,
      });

      await queryInterface.createTable(
        "retail_stock_entries",
        {
          entryId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            field: "entry_id",
          },
          productId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "product_id",
            references: { model: "retail_products", key: "product_id" },
          },
          // RESTOCK, SALE, SALE_VOID or WRITE_OFF.
          type: { type: Sequelize.STRING, allowNull: false },
          // Signed: positive adds stock, negative takes it away.
          quantityChange: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "quantity_change",
          },
          saleId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: "sale_id",
            references: { model: "retail_sales", key: "sale_id" },
          },
          notes: { type: Sequelize.TEXT, allowNull: true },
          loggedBy: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "logged_by",
            references: { model: "users", key: "user_id" },
          },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.addIndex(
        "retail_stock_entries",
        ["product_id", "created_at"],
        { name: "idx_retail_stock_entries_product_created", transaction },
      );
    });
  },

  // Loses every retail product, sale, and stock movement.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("retail_stock_entries", { transaction });
      await queryInterface.dropTable("retail_sale_items", { transaction });
      await queryInterface.dropTable("retail_sales", { transaction });
      await queryInterface.dropTable("retail_products", { transaction });
    });
  },
};
