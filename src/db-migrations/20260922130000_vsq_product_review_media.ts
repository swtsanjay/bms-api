import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_product_review_media', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('review_id').unsigned().notNullable();
        table.enu('kind', ['IMAGE', 'VIDEO']).notNullable();
        table.string('object_key', 512).notNullable();
        table.string('public_url', 1024).notNullable();
        table.string('mime_type', 100).notNullable();
        table.integer('byte_size').unsigned().notNullable();
        table.specificType('position', 'tinyint unsigned').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('review_id', 'vsq_review_media_review_fk').references('id').inTable('vsq_product_reviews').onDelete('CASCADE');
        table.unique(['review_id', 'position'], 'vsq_review_media_position_uq');
        table.index(['review_id', 'kind'], 'vsq_review_media_kind_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_product_review_media');
}
