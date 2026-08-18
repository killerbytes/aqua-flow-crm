"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("invoices", {
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        field: "invoice_id",
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "customer_id",
        references: {
          model: "customers",
          key: "customer_id",
        },
      },
      dateIssued: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        field: "date_issued",
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: "due_date",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "UNPAID",
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: "payment_date",
      },
      loggedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "logged_by",
        references: {
          model: "users",
          key: "user_id",
        },
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
    });
    await queryInterface.addIndex("invoices", ["customer_id"], {
      name: "idx_invoices_customer_id",
    });
    await queryInterface.addIndex("invoices", ["status"], {
      name: "idx_invoices_status",
    });
    await queryInterface.addIndex("invoices", ["due_date"], {
      name: "idx_invoices_due_date",
    });
    await queryInterface.addIndex("invoices", ["date_issued"], {
      name: "idx_invoices_date_issued",
    });
    await queryInterface.addIndex("invoices", ["payment_date"], {
      name: "idx_invoices_payment_date",
    });

    await queryInterface.createTable("invoice_details", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "invoice_id",
        references: {
          model: "invoices",
          key: "invoice_id",
        },
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "order_id",
        references: {
          model: "orders",
          key: "order_id",
        },
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
    });
    await queryInterface.addIndex("invoice_details", ["invoice_id"], {
      name: "idx_invoice_details_invoice_id",
    });
    await queryInterface.addIndex("invoice_details", ["order_id"], {
      name: "idx_invoice_details_order_id",
    });

    await queryInterface.createTable("invoice_payments", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "invoice_id",
        references: {
          model: "invoices",
          key: "invoice_id",
        },
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        field: "payment_date",
      },
      paymentAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: "payment_amount",
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: false,
        field: "payment_method",
      },
      paymentNotes: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "payment_notes",
      },
      loggedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "logged_by",
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    });
    await queryInterface.addIndex("invoice_payments", ["invoice_id"], {
      name: "idx_invoice_payments_invoice_id",
    });
    await queryInterface.addIndex("invoice_payments", ["payment_date"], {
      name: "idx_invoice_payments_payment_date",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("invoice_payments");
    await queryInterface.dropTable("invoice_details");
    await queryInterface.dropTable("invoices");
  },
};
