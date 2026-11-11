"use strict";

const INDEX_NAME = "idx_orders_status_delivered_at";

/**
 * Sales figures (dashboard, sales trend, the order list's Delivered Sales) find
 * delivered orders by when they were delivered.
 *
 * On PostgreSQL the index is built CONCURRENTLY, so the running app can keep
 * writing orders while it builds. That can't happen inside a transaction, so
 * this migration doesn't use one.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const concurrently = queryInterface.sequelize.getDialect() === "postgres";
    await queryInterface.addIndex("orders", ["status", "delivered_at"], {
      name: INDEX_NAME,
      concurrently,
    });
  },

  async down(queryInterface) {
    const concurrently = queryInterface.sequelize.getDialect() === "postgres";
    await queryInterface.removeIndex("orders", INDEX_NAME, { concurrently });
  },
};
