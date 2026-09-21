import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!await knex.schema.hasColumn('vsq_media_assets', 'original_byte_size')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.bigInteger('original_byte_size').unsigned().nullable().after('original_url');
        });

        // A pre-optimization byte_size describes the same object as original_url.
        // Optimized rows need their original size fetched from S3 instead.
        await knex('vsq_media_assets')
            .whereNull('original_byte_size')
            .whereNotNull('byte_size')
            .whereRaw('original_url = public_url')
            .update({ original_byte_size: knex.ref('byte_size') });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasColumn('vsq_media_assets', 'original_byte_size')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropColumn('original_byte_size');
        });
    }
}
