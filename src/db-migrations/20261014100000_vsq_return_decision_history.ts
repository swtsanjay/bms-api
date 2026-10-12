import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_return_status_history', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('return_id').unsigned().notNullable();
        table.string('from_status', 40).nullable();
        table.string('to_status', 40).notNullable();
        table.string('actor_type', 20).notNullable();
        table.bigInteger('actor_id').unsigned().notNullable();
        table.text('note').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('return_id', 'vsq_rsh_return_fk').references('id').inTable('vsq_returns').onDelete('RESTRICT');
        table.index(['return_id', 'id'], 'vsq_rsh_return_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_return_status_history');
}
