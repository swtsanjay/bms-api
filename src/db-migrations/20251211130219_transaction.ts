import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('transactions', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users')
            .onDelete('CASCADE').onUpdate('CASCADE');
        table.string('transaction_id', 100).nullable();
        table.enu('type', ['EXPENSE', 'PAYMENT']).defaultTo('PAYMENT').notNullable();
        table.integer('amount').notNullable();
        table.string('comment', 255).nullable();
        table.string('receipt_url', 255).nullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        /* indexs */
        table.index(['id'], 'transaction_primary_id');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('transactions');
}

