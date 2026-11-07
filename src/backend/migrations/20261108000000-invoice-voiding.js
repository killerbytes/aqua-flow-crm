"use strict";

const INDEX = "idx_invoice_details_order_id";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "invoices",
        "voided_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "invoices",
        "voided_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "user_id" },
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "invoices",
        "void_reason",
        { type: Sequelize.TEXT, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "invoice_details",
        "voided_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );

      // An order can be on one active invoice. Voided links stay as a record of
      // what the invoice held, and free the order to be invoiced again.
      await queryInterface.removeIndex("invoice_details", INDEX, { transaction });
      await queryInterface.addIndex("invoice_details", ["order_id"], {
        name: INDEX,
        unique: true,
        where: { voided_at: null },
        transaction,
      });
    });
  },

  // Fails if an order has been re-invoiced after a void, because the older rule
  // can't represent that. Those invoices need resolving first.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("invoice_details", INDEX, { transaction });
      await queryInterface.removeColumn("invoice_details", "voided_at", { transaction });
      await queryInterface.addIndex("invoice_details", ["order_id"], {
        name: INDEX,
        unique: true,
        transaction,
      });

      await queryInterface.removeColumn("invoices", "void_reason", { transaction });
      await queryInterface.removeColumn("invoices", "voided_by", { transaction });
      await queryInterface.removeColumn("invoices", "voided_at", { transaction });
    });
  },
};
