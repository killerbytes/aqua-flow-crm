"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. users table
    await queryInterface.createTable("users", {
      userId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "user_id",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: false,
        field: "password_hash",
      },
      role: {
        type: Sequelize.STRING,
        defaultValue: "CASHIER",
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: "is_active",
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

    // 2. customers table
    await queryInterface.createTable("customers", {
      customerId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "customer_id",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "ACTIVE",
        allowNull: false,
      },
      barangayId: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "barangay_id",
      },
      searchText: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: "search_text",
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

    // Indexes for customers
    await queryInterface.addIndex("customers", ["status"], {
      name: "idx_customers_status",
    });
    await queryInterface.addIndex("customers", ["barangay_id"], {
      name: "idx_customers_barangay_id",
    });

    // 3. product_inventories table
    await queryInterface.createTable("product_inventories", {
      productId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "product_id",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      stockInStation: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "stock_in_station",
      },
      stockWithCustomers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "stock_with_customers",
      },
      stockDamaged: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "stock_damaged",
      },
      stockLost: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "stock_lost",
      },
      unitPrice: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
        field: "unit_price",
      },
      isLendOnly: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: "is_lend_only",
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: "is_default",
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

    // 4. customer_equipment_balances table
    await queryInterface.createTable("customer_equipment_balances", {
      balanceId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "balance_id",
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "customer_id",
        references: {
          model: "customers",
          key: "customer_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "product_id",
        references: {
          model: "product_inventories",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantityOwed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "quantity_owed",
      },
      quantityTemporaryOwed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: "quantity_temporary_owed",
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

    await queryInterface.addIndex("customer_equipment_balances", ["customer_id", "product_id"], {
      unique: true,
      name: "idx_cust_eq_bal_cust_prod_unique",
    });

    // 5. customer_special_pricings table
    await queryInterface.createTable("customer_special_pricings", {
      pricingId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "pricing_id",
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "customer_id",
        references: {
          model: "customers",
          key: "customer_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "product_id",
        references: {
          model: "product_inventories",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      discountAmount: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
        field: "discount_amount",
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

    await queryInterface.addIndex("customer_special_pricings", ["customer_id", "product_id"], {
      unique: true,
      name: "idx_cust_spec_pricing_cust_prod_unique",
    });

    // 6. equipment_ledger_entries table
    await queryInterface.createTable("equipment_ledger_entries", {
      entryId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "entry_id",
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "product_id",
        references: {
          model: "product_inventories",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      fromAccountType: {
        type: Sequelize.STRING,
        allowNull: false,
        field: "from_account_type",
      },
      fromAccountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: "from_account_id",
      },
      toAccountType: {
        type: Sequelize.STRING,
        allowNull: false,
        field: "to_account_type",
      },
      toAccountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: "to_account_id",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "MANUAL_LOG",
        field: "reference_type",
      },
      referenceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: "reference_id",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      loggedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: "logged_by",
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    await queryInterface.addIndex("equipment_ledger_entries", ["product_id"], {
      name: "idx_eq_ledger_product_id",
    });
    await queryInterface.addIndex("equipment_ledger_entries", ["from_account_id"], {
      name: "idx_eq_ledger_from_account_id",
    });
    await queryInterface.addIndex("equipment_ledger_entries", ["to_account_id"], {
      name: "idx_eq_ledger_to_account_id",
    });

    // 7. orders table
    await queryInterface.createTable("orders", {
      orderId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "order_id",
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "customer_id",
        references: {
          model: "customers",
          key: "customer_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      totalAmount: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
        field: "total_amount",
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "PENDING",
        allowNull: false,
      },
      paymentStatus: {
        type: Sequelize.STRING,
        defaultValue: "UNPAID",
        allowNull: false,
        field: "payment_status",
      },
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
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "created_by",
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

    await queryInterface.addIndex("orders", ["customer_id"], {
      name: "idx_orders_customer_id",
    });
    await queryInterface.addIndex("orders", ["status"], {
      name: "idx_orders_status",
    });
    await queryInterface.addIndex("orders", ["payment_status"], {
      name: "idx_orders_payment_status",
    });
    await queryInterface.addIndex("orders", ["created_at"], {
      name: "idx_orders_created_at",
    });

    // 8. order_details table
    await queryInterface.createTable("order_details", {
      detailId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "detail_id",
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "order_id",
        references: {
          model: "orders",
          key: "order_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "product_id",
        references: {
          model: "product_inventories",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unitPrice: {
        type: Sequelize.FLOAT,
        allowNull: false,
        field: "unit_price",
      },
      discount: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("order_details", ["order_id"], {
      name: "idx_order_details_order_id",
    });
    await queryInterface.addIndex("order_details", ["product_id"], {
      name: "idx_order_details_product_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("order_details");
    await queryInterface.dropTable("orders");
    await queryInterface.dropTable("equipment_ledger_entries");
    await queryInterface.dropTable("customer_special_pricings");
    await queryInterface.dropTable("customer_equipment_balances");
    await queryInterface.dropTable("product_inventories");
    await queryInterface.dropTable("customers");
    await queryInterface.dropTable("users");
  },
};
