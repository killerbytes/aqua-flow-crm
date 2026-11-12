"use strict";

/**
 * A flat fee staff can add to an order, included in its total. Existing orders
 * have none, and the default keeps the previous version working while it is
 * still serving.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "surcharge", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    // Removing a column in SQLite rebuilds the table and drops its indexes, which
    // earlier rollbacks need. Tests drop the whole tables anyway.
    if (queryInterface.sequelize.getDialect() !== "postgres") return;

    await queryInterface.removeColumn("orders", "surcharge");
  },
};
