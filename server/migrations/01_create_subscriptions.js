export function up(knex) {
  return knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable();
    table.string('city').notNullable();
    table.string('frequency').notNullable();
    table.string('token').notNullable();
    table.boolean('is_active').defaultTo(false);
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTable('subscriptions');
}