"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("customers", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("product_inventories", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("customer_special_pricings", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addIndex("users", ["deleted_at"], {
      name: "idx_users_deleted_at",
    });
    await queryInterface.addIndex("customers", ["deleted_at"], {
      name: "idx_customers_deleted_at",
    });
    await queryInterface.addIndex("product_inventories", ["deleted_at"], {
      name: "idx_product_inventories_deleted_at",
    });
    await queryInterface.addIndex("customer_special_pricings", ["deleted_at"], {
      name: "idx_customer_special_pricings_deleted_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "idx_users_deleted_at");
    await queryInterface.removeIndex("customers", "idx_customers_deleted_at");
    await queryInterface.removeIndex("product_inventories", "idx_product_inventories_deleted_at");
    await queryInterface.removeIndex("customer_special_pricings", "idx_customer_special_pricings_deleted_at");

    await queryInterface.removeColumn("users", "deleted_at");
    await queryInterface.removeColumn("customers", "deleted_at");
    await queryInterface.removeColumn("product_inventories", "deleted_at");
    await queryInterface.removeColumn("customer_special_pricings", "deleted_at");
  },
};
