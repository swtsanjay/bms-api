import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('orders', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE').onUpdate('CASCADE');
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        /* indexs */
        table.index(['id'], 'order_primary_id');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('orders');
}