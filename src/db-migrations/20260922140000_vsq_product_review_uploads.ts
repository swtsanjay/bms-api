import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_product_review_uploads', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('product_id').unsigned().notNullable();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.enu('kind', ['IMAGE', 'VIDEO']).notNullable();
        table.string('object_key', 512).notNullable().unique();
        table.string('mime_type', 100).notNullable();
        table.integer('expected_byte_size').unsigned().notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('consumed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('product_id', 'vsq_review_upload_product_fk').references('id').inTable('vsq_products').onDelete('CASCADE');
        table.foreign('customer_id', 'vsq_review_upload_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.index(['customer_id', 'created_at'], 'vsq_review_upload_rate_idx');
        table.index(['expires_at', 'consumed_at'], 'vsq_review_upload_cleanup_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_product_review_uploads');
}
