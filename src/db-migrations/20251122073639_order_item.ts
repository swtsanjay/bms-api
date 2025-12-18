import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('order_items', function (table) {
    table.increments('id').unsigned().primary();
    table
      .integer('order_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('name', 100).nullable();
    table.integer('quantity').notNullable();
    table.integer('pp_price').notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    /* indexs */
    table.index(['id'], 'order_primary_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('order_items');
}
