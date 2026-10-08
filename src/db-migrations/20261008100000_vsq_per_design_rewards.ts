import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_design_submissions', (table) => {
        table.integer('approved_reward_minor').unsigned().nullable();
        table.string('thumbnail_object_key', 500).nullable();
    });
    await knex.schema.alterTable('vsq_design_rewards', (table) => {
        table.index(['customer_id'], 'vsq_design_rewards_customer_id_idx');
    });
    await knex.schema.alterTable('vsq_design_rewards', (table) => {
        table.dropUnique(['customer_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    const duplicates = await knex('vsq_design_rewards').select('customer_id').count('* as total').groupBy('customer_id').havingRaw('COUNT(*) > 1').first();
    if (duplicates) throw new Error('Cannot restore one-reward-per-customer constraint while multiple design rewards exist');
    await knex.schema.alterTable('vsq_design_rewards', (table) => table.unique(['customer_id']));
    await knex.schema.alterTable('vsq_design_rewards', (table) => table.dropIndex(['customer_id'], 'vsq_design_rewards_customer_id_idx'));
    await knex.schema.alterTable('vsq_design_submissions', (table) => {
        table.dropColumn('approved_reward_minor');
        table.dropColumn('thumbnail_object_key');
    });
}
