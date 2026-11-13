"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Set when an order is voided. Orders cancelled before this have none.
      await queryInterface.addColumn(
        "orders",
        "voided_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "orders",
        "voided_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "user_id" },
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "orders",
        "void_reason",
        { type: Sequelize.TEXT, allowNull: true },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    // Removing a column in SQLite rebuilds the table and drops its indexes, which
    // earlier rollbacks need. Tests drop the whole tables anyway.
    if (queryInterface.sequelize.getDialect() !== "postgres") return;

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("orders", "void_reason", { transaction });
      await queryInterface.removeColumn("orders", "voided_by", { transaction });
      await queryInterface.removeColumn("orders", "voided_at", { transaction });
    });
  },
};
