/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("subscriptions", function (table) {
    table.increments("id").primary();
    table.string("email").notNullable();
    table.string("city").notNullable();
    table.string("frequency").notNullable();
    table.string("token").notNullable();
    table.boolean("is_active").defaultTo(false);
    table.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("subscriptions");
};
