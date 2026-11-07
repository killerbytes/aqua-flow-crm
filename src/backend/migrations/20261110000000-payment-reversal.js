"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "invoice_payments",
        "reversed_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "invoice_payments",
        "reversed_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "user_id" },
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "invoice_payments",
        "reversal_reason",
        { type: Sequelize.TEXT, allowNull: true },
        { transaction },
      );
    });
  },

  // Rolling back makes reversed payments count again, so it refuses while any exist.
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM invoice_payments WHERE reversed_at IS NOT NULL",
    );
    if (Number(rows[0].count) > 0) {
      throw new Error(
        "Some payments are reversed. Rolling back would count them as paid again.",
      );
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("invoice_payments", "reversal_reason", { transaction });
      await queryInterface.removeColumn("invoice_payments", "reversed_by", { transaction });
      await queryInterface.removeColumn("invoice_payments", "reversed_at", { transaction });
    });
  },
};
