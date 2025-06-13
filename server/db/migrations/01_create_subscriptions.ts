import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("subscriptions", (table: Knex.TableBuilder) => {
    table.increments("id").primary();
    table.string("email").notNullable();
    table.string("city").notNullable();
    table.string("frequency").notNullable();
    table.string("token").notNullable();
    table.boolean("confirmed").defaultTo(false);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("subscriptions");
}
