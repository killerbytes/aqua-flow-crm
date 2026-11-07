"use strict";

const MONEY_COLUMNS = [
  ["product_inventories", "unit_price", { allowNull: false, defaultValue: 0 }],
  ["customer_special_pricings", "discount_amount", { allowNull: false, defaultValue: 0 }],
  ["orders", "total_amount", { allowNull: false, defaultValue: 0 }],
  ["order_details", "unit_price", { allowNull: false }],
  ["order_details", "discount", { allowNull: false, defaultValue: 0 }],
];

const changeMoneyColumns = async (queryInterface, type, transaction) => {
  // SQLite doesn't enforce column types, and changing one there rebuilds the
  // table and drops its indexes. Tests build their schema from the models.
  if (queryInterface.sequelize.getDialect() !== "postgres") return;

  for (const [table, column, options] of MONEY_COLUMNS) {
    await queryInterface.changeColumn(table, column, { type, ...options }, { transaction });
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await changeMoneyColumns(queryInterface, Sequelize.DECIMAL(10, 2), transaction);

      await queryInterface.removeIndex("invoice_details", "idx_invoice_details_order_id", { transaction });
      await queryInterface.addIndex("invoice_details", ["order_id"], {
        name: "idx_invoice_details_order_id",
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("invoice_details", "idx_invoice_details_order_id", { transaction });
      await queryInterface.addIndex("invoice_details", ["order_id"], {
        name: "idx_invoice_details_order_id",
        transaction,
      });

      await changeMoneyColumns(queryInterface, Sequelize.FLOAT, transaction);
    });
  },
};
