"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Existing tokens have no version and count as 0, so this logs nobody out.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "token_version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    // Removing a column in SQLite rebuilds the table and drops its indexes, which
    // earlier rollbacks need. Tests drop the whole table anyway.
    if (queryInterface.sequelize.getDialect() !== "postgres") return;

    await queryInterface.removeColumn("users", "token_version");
  },
};
