"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const keys = [
      "customers_phone_key",
      "customers_phone_key1",
      "customers_phone_key2",
      "customers_phone_key3",
      "customers_phone_key4",
      "customers_phone_key5",
    ];
    for (const key of keys) {
      try {
        await queryInterface.removeConstraint("customers", key);
      } catch (err) {
        // Ignore error if constraint does not exist (e.g. SQLite test env or if key was already dropped)
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.addConstraint("customers", {
        fields: ["phone"],
        type: "unique",
        name: "customers_phone_key",
      });
    } catch (err) {
      // Ignore error if constraint already exists
    }
  },
};

