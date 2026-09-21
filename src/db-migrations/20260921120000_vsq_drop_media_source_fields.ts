import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!await knex.schema.hasTable('vsq_media_assets')) return;

    // Older installations may still have the unique import index; current
    // installations have the non-unique source index instead.
    const indexes = await knex('information_schema.STATISTICS')
        .distinct('INDEX_NAME')
        .whereRaw('TABLE_SCHEMA = DATABASE()')
        .where({ TABLE_NAME: 'vsq_media_assets' })
        .whereIn('INDEX_NAME', ['vsq_ma_source_idx', 'vsq_ma_source_uq']);
    for (const index of indexes) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropIndex(['source_system', 'source_id'], index.INDEX_NAME);
        });
    }

    const columns = ['source_url', 'source_system', 'source_id'];
    const existing: string[] = [];
    for (const column of columns) {
        if (await knex.schema.hasColumn('vsq_media_assets', column)) existing.push(column);
    }
    if (existing.length) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropColumns(...existing);
        });
    }
}

export async function down(): Promise<void> {
    throw new Error('Removed media source metadata cannot be restored by rolling back this migration');
}
