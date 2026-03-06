import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('transactions', function (table) {
        table.integer('deleted_by').unsigned().nullable()
            .references('id').inTable('users')
            .onDelete('SET NULL').onUpdate('CASCADE');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('transactions', function (table) {
        table.dropColumn('deleted_by');
    });
}
