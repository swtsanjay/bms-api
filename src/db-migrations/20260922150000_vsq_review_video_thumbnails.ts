import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_product_review_media', (table) => {
        table.string('thumbnail_object_key', 512).nullable();
        table.string('thumbnail_url', 1024).nullable();
        table.integer('thumbnail_byte_size').unsigned().nullable();
    });

    await knex.schema.createTable('vsq_product_review_thumbnail_uploads', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('review_id').unsigned().notNullable();
        table.bigInteger('media_id').unsigned().notNullable();
        table.bigInteger('admin_id').unsigned().notNullable();
        table.string('object_key', 512).notNullable();
        table.string('mime_type', 100).notNullable();
        table.integer('expected_byte_size').unsigned().notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('consumed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('review_id', 'vsq_review_thumb_review_fk').references('id').inTable('vsq_product_reviews').onDelete('CASCADE');
        table.foreign('media_id', 'vsq_review_thumb_media_fk').references('id').inTable('vsq_product_review_media').onDelete('CASCADE');
        table.index(['admin_id', 'created_at'], 'vsq_review_thumb_admin_idx');
        table.index(['media_id', 'consumed_at'], 'vsq_review_thumb_media_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_product_review_thumbnail_uploads');
    await knex.schema.alterTable('vsq_product_review_media', (table) => {
        table.dropColumn('thumbnail_object_key');
        table.dropColumn('thumbnail_url');
        table.dropColumn('thumbnail_byte_size');
    });
}
