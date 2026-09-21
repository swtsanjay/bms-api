import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!await knex.schema.hasColumn('vsq_media_assets', 'optimization_status')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.string('optimization_status', 30).notNullable().defaultTo('NOT_OPTIMIZED');
            table.timestamp('optimized_at').nullable();
            table.text('optimization_error').nullable();
            table.index(['optimization_status', 'updated_at'], 'vsq_ma_optimization_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasColumn('vsq_media_assets', 'optimization_status')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropIndex(['optimization_status', 'updated_at'], 'vsq_ma_optimization_idx');
            table.dropColumn('optimization_status');
            table.dropColumn('optimized_at');
            table.dropColumn('optimization_error');
        });
    }
}
