"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "order_payments",
        {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          orderId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "order_id",
            references: { model: "orders", key: "order_id" },
          },
          amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
          paymentMethod: {
            type: Sequelize.STRING,
            allowNull: true,
            field: "payment_method",
          },
          paymentNotes: {
            type: Sequelize.TEXT,
            allowNull: true,
            field: "payment_notes",
          },
          paidAt: { type: Sequelize.DATE, allowNull: false, field: "paid_at" },
          loggedBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: "logged_by",
            references: { model: "users", key: "user_id" },
          },
          reversedAt: { type: Sequelize.DATE, allowNull: true, field: "reversed_at" },
          reversedBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: "reversed_by",
            references: { model: "users", key: "user_id" },
          },
          reversalReason: {
            type: Sequelize.TEXT,
            allowNull: true,
            field: "reversal_reason",
          },
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
        },
        { transaction },
      );
      await queryInterface.addIndex("order_payments", ["order_id"], {
        name: "idx_order_payments_order_id",
        transaction,
      });
      await queryInterface.addIndex("order_payments", ["paid_at"], {
        name: "idx_order_payments_paid_at",
        transaction,
      });

      await queryInterface.addColumn(
        "orders",
        "delivered_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );

      // Orders already paid directly get a payment record, so they can be
      // reversed. Their real payment time wasn't kept, so the order's time stands
      // in for it. Orders paid through an invoice already have one there.
      await queryInterface.sequelize.query(
        `INSERT INTO order_payments
           (order_id, amount, payment_method, payment_notes, paid_at, logged_by, created_at, updated_at)
         SELECT o.order_id, o.total_amount, o.payment_method, o.payment_notes,
                o.created_at, o.created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM orders o
         WHERE o.payment_status = 'PAID'
           AND NOT EXISTS (
             SELECT 1 FROM invoice_details d WHERE d.order_id = o.order_id
           )`,
        { transaction },
      );

      // The delivery time wasn't kept either, so the order's time stands in.
      await queryInterface.sequelize.query(
        `UPDATE orders SET delivered_at = created_at WHERE status = 'DELIVERED'`,
        { transaction },
      );
    });
  },

  // Loses payment history and delivery dates. Payment status on orders stays.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("order_payments", { transaction });
      await queryInterface.removeColumn("orders", "delivered_at", { transaction });
    });
  },
};
