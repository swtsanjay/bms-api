import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('transactions', function (table) {
        table.integer('payment_transfer_to').unsigned().nullable()
            .references('id').inTable('users')
            .onDelete('SET NULL').onUpdate('CASCADE');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('transactions', function (table) {
        table.dropColumn('payment_transfer_to');
    });
}