import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('categories', function (table) {
        table.increments('id').unsigned().primary();
        table.string('title', 100).notNullable();
        table.string('code', 100).notNullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        /* indexs */
        table.index(['id'], 'order_primary_id');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('categories');
}

