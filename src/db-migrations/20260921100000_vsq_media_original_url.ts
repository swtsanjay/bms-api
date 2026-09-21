import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!await knex.schema.hasColumn('vsq_media_assets', 'original_url')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.string('original_url', 1000).nullable().after('public_url');
        });

        // Images that have not completed optimization still point at the owned,
        // original S3 object. Capture that URL before public_url can be replaced.
        await knex('vsq_media_assets')
            .whereNull('original_url')
            .whereNotNull('public_url')
            .whereIn('optimization_status', ['NOT_OPTIMIZED', 'FAILED'])
            .update({ original_url: knex.ref('public_url') });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasColumn('vsq_media_assets', 'original_url')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropColumn('original_url');
        });
    }
}
