"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Who marked the order delivered. Unknown for orders delivered before this.
      await queryInterface.addColumn(
        "orders",
        "delivered_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "user_id" },
        },
        { transaction },
      );
      // Station stock at or below this shows as low. Null means no warning.
      await queryInterface.addColumn(
        "product_inventories",
        "low_stock_threshold",
        { type: Sequelize.INTEGER, allowNull: true },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    // Removing a column in SQLite rebuilds the table and drops its indexes, which
    // earlier rollbacks need. Tests drop the whole tables anyway.
    if (queryInterface.sequelize.getDialect() !== "postgres") return;

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("product_inventories", "low_stock_threshold", { transaction });
      await queryInterface.removeColumn("orders", "delivered_by", { transaction });
    });
  },
};
