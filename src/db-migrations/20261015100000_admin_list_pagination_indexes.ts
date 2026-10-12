import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_design_submissions', (table) => {
        table.index(['created_at', 'id'], 'vsq_design_created_id_idx');
    });
    await knex.schema.alterTable('vsq_gift_purchases', (table) => {
        table.index(['created_at', 'id'], 'vsq_gift_created_id_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_gift_purchases', (table) => table.dropIndex(['created_at', 'id'], 'vsq_gift_created_id_idx'));
    await knex.schema.alterTable('vsq_design_submissions', (table) => table.dropIndex(['created_at', 'id'], 'vsq_design_created_id_idx'));
}
